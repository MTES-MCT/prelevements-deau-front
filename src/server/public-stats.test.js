import test from 'ava'

import {getPublicStats} from './public-stats.js'

const snapshot = {
  month: '2026-08',
  generatedAt: '2026-09-09T12:00:00Z',
  totals: {
    pointsCount: 0, preleveursCount: 0, sageCount: 0, departmentCount: 0
  },
  territories: {SAGE: [], DEPARTEMENT: []},
  channels: []
}

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
