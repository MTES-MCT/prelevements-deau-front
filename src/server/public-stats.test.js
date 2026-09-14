import test from 'ava'

import {getPublicStats, getPublicStatsPage} from './public-stats.js'

const snapshot = {
  month: '2026-08',
  generatedAt: '2026-09-09T12:00:00Z',
  totals: {
    pointsCount: 0, preleveursCount: 0, sageCount: 0, departmentCount: 0
  },
  territories: {SAGE: [], DEPARTEMENT: []},
  channels: []
}

function pageOptions(responses = {}) {
  const requests = []
  return {
    requests,
    options: {
      apiUrl: 'https://api.example.test',
      now: () => Date.parse('2026-09-09T12:30:00Z'),
      async fetchImpl(url) {
        const month = new URL(url).searchParams.get('month') ?? 'latest'
        requests.push(month)
        const value = responses[month] ?? {...snapshot, month: month === 'latest' ? snapshot.month : month}
        return value instanceof Response ? value : new Response(JSON.stringify(value))
      }
    }
  }
}

test('le mois sélectionné ne remplace pas les chiffres globaux, canaux et activité', async t => {
  const latest = {...snapshot, channels: [{count: 5}], activeUsers: {months: [{month: '2026-08', total: 10}]}}
  const selected = {...snapshot, month: '2026-07', territories: {SAGE: [{reportingPreleveursCount: 3}], DEPARTEMENT: []}}
  const {options, requests} = pageOptions({latest, '2026-07': selected})
  const result = await getPublicStatsPage('2026-07', options)
  t.deepEqual(result.data, latest)
  t.deepEqual(result.territoryData, selected)
  t.is(result.error, null)
  t.is(result.territoryError, null)
  t.deepEqual(requests, ['latest', '2026-07'])
})

test('le dernier mois ne charge qu’un seul instantané public', async t => {
  for (const month of [undefined, null, '', '2026-08']) {
    const {options, requests} = pageOptions()
    const result = await getPublicStatsPage(month, options)
    t.is(result.data, result.territoryData)
    t.deepEqual(requests, ['latest'])
  }
})

test('une erreur de sélection ou de données territoriales préserve les autres sections', async t => {
  for (const [month, status, error] of [['2026-09', 400, 'invalid-month'], ['2026-07', 503, 'unavailable']]) {
    const {options} = pageOptions({[month]: new Response('{}', {status})})
    const result = await getPublicStatsPage(month, options)
    t.deepEqual(result.data, snapshot)
    t.is(result.territoryData, null)
    t.is(result.error, null)
    t.is(result.territoryError, error)
  }
  const {options, requests} = pageOptions()
  const result = await getPublicStatsPage(['2026-07'], options)
  t.is(result.territoryError, 'invalid-month')
  t.deepEqual(requests, ['latest'])
})

test('le mois territorial reste consultable si le dernier instantané est indisponible', async t => {
  const {options} = pageOptions({latest: new Response('{}', {status: 503})})
  const result = await getPublicStatsPage('2026-07', options)
  t.is(result.data, null)
  t.is(result.error, 'unavailable')
  t.is(result.territoryData.month, '2026-07')
  t.is(result.territoryError, null)
})

test('charge les agrégats publics sans authentification avec un cache serveur court', async t => {
  let request
  const result = await getPublicStats('2026-08', {
    apiUrl: 'https://api.example.test',
    now: () => Date.parse('2026-09-09T12:30:00Z'),
    async fetchImpl(url, options) {
      request = {url, options}
      return new Response(JSON.stringify(snapshot), {status: 200})
    }
  })
  t.deepEqual(result, {data: snapshot, error: null})
  t.is(request.url, 'https://api.example.test/api/stats/public?month=2026-08')
  t.deepEqual(request.options.headers, {Accept: 'application/json'})
  t.is(request.options.credentials, 'omit')
  t.deepEqual(request.options.next, {revalidate: 60})
  t.is(request.options.cache, undefined)
  t.true(request.options.signal instanceof AbortSignal)
})

test('ne présente pas indéfiniment un ancien résultat si la revalidation du cache échoue', async t => {
  await Promise.all(['2026-09-09T10:00:00Z', 'not-a-date', null].map(async generatedAt => {
    const result = await getPublicStats('2026-08', {
      apiUrl: 'https://api.example.test',
      now: () => Date.parse('2026-09-09T12:30:00Z'),
      async fetchImpl() {
        return new Response(JSON.stringify({...snapshot, generatedAt}), {status: 200})
      }
    })
    t.deepEqual(result, {data: null, error: 'unavailable'})
  }))
})

test('n’appelle pas l’API si le mois demandé est malformé', async t => {
  const result = await getPublicStats(['2026-08'], {
    apiUrl: 'https://api.example.test',
    async fetchImpl() {
      t.fail('La requête ne doit pas être envoyée')
    }
  })
  t.deepEqual(result, {data: null, error: 'invalid-month'})
})

test('conserve l’état indisponible pour une panne API et une réponse inattendue', async t => {
  const responses = [
    new Response('Service unavailable', {status: 503}),
    new Response('Unauthorized', {status: 401}),
    new Response('Not JSON', {status: 200}),
    new Response('{}', {status: 200})
  ]
  await Promise.all(responses.map(async response => {
    const result = await getPublicStats(undefined, {
      apiUrl: 'https://api.example.test',
      async fetchImpl() {
        return response
      }
    })
    t.deepEqual(result, {data: null, error: 'unavailable'})
  }))
})

test('rend une erreur de mois explicite si l’API refuse un mois non clos', async t => {
  const result = await getPublicStats('2026-09', {
    apiUrl: 'https://api.example.test',
    async fetchImpl() {
      return new Response('{}', {status: 400})
    }
  })
  t.deepEqual(result, {data: null, error: 'invalid-month'})
})

test('traite une interruption réseau sans exposer les détails de l’exception', async t => {
  const result = await getPublicStats(undefined, {
    apiUrl: 'https://api.example.test',
    async fetchImpl() {
      throw new Error('Internal connection details')
    }
  })
  t.deepEqual(result, {data: null, error: 'unavailable'})
})
