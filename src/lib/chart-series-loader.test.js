import test from 'ava'
import {buildChartSeriesQuery} from './chart-series.js'
import {loadChartSeriesProgressively} from './chart-series-loader.js'

const deferred = () => Promise.withResolvers()
const response = value => ({metadata: {frequency: '1 week'}, values: [{date: '2026-W01', value}]})
const query = metricTypeCode => buildChartSeriesQuery({preleveurId: 'owner', metricTypeCode, aggregationFrequency: '1 week'})

test('la première série s’affiche sans attendre les autres et une erreur reste locale', async t => {
  const volume = deferred()
  const debit = deferred()
  const states = []
  const loading = loadChartSeriesProgressively({
    requests: [['volume', query('volume')], ['débit', query('débit')]],
    load: key => key === query('volume') ? volume.promise : debit.promise,
    onUpdate: state => states.push(state)
  })
  volume.resolve(response(10))
  await volume.promise
  await Promise.resolve()
  t.deepEqual(states.at(-1).pending, ['débit'])
  t.deepEqual(states.at(-1).series.get('volume'), response(10))
  debit.reject(Object.assign(new Error('Débit indisponible'), {code: 500}))
  await loading
  t.is(states.at(-1).series.size, 1)
  t.deepEqual(states.at(-1).pending, [])
  t.is(states.at(-1).errors.get('débit').message, 'Débit indisponible')
})

test('une promesse SSR exacte est réutilisée sans requête navigateur', async t => {
  const initial = deferred()
  const states = []
  let calls = 0
  const loading = loadChartSeriesProgressively({requests: [['volume', query('volume')]],
    initialSeries: [{query: query('volume'), response: initial.promise}],
    load: async () => { calls++; return response(999) }, onUpdate: state => states.push(state)})
  t.is(calls, 0)
  initial.resolve(response(10))
  await loading
  t.deepEqual(states.at(-1).series.get('volume'), response(10))
  t.is(calls, 0)
})

test('une autre date ou un autre périmètre ne réutilise jamais une réponse préchargée', async t => {
  let calls = 0
  let state
  await loadChartSeriesProgressively({requests: [['volume', query('volume')]],
    initialSeries: [{query: `${query('volume')}&startDate=2026-01-01`, response: response(999)}],
    load: async () => { calls++; return response(10) }, onUpdate: value => { state = value }})
  t.is(calls, 1)
  t.deepEqual(state.series.get('volume'), response(10))
})

test('les requêtes identiques sont mutualisées à l’intérieur du chargement', async t => {
  let calls = 0
  let state
  await loadChartSeriesProgressively({requests: [['a', query('volume')], ['b', query('volume')]],
    load: async () => { calls++; return response(0) }, onUpdate: value => { state = value }})
  t.is(calls, 1)
  t.is(state.series.size, 2)
  t.deepEqual(state.series.get('a').values, [{date: '2026-W01', value: 0}])
})

test('un changement de filtre ignore une ancienne promesse SSR même si elle termine', async t => {
  const initial = deferred()
  const controller = new AbortController()
  const states = []
  const loading = loadChartSeriesProgressively({requests: [['volume', query('volume')]],
    initialSeries: [{query: query('volume'), response: initial.promise}], signal: controller.signal,
    onUpdate: value => states.push(value)})
  controller.abort()
  initial.resolve(response(999))
  await loading
  t.is(states.length, 1)
  t.is(states[0].series.size, 0)
})

test('une erreur SSR est affichée et une session expirée efface toutes les séries', async t => {
  let state
  await loadChartSeriesProgressively({requests: [['volume', query('volume')], ['débit', query('débit')]],
    initialSeries: [{query: query('volume'), response: response(10)},
      {query: query('débit'), response: Promise.resolve({error: 'Session expirée', code: 401})}],
    onUpdate: value => { state = value }})
  t.is(state.series.size, 0)
  t.deepEqual(state.pending, [])
  t.is(state.errors.get('débit').code, 401)
})

test('un échec SSR transitoire réessaie une fois et ne bloque pas le retour au même filtre', async t => {
  const initialSeries = [{query: query('volume'), response: Promise.resolve({error: 'Indisponible', code: 500})}]
  let calls = 0
  let state
  const load = async () => {
    calls++
    if (calls === 1) throw Object.assign(new Error('Encore indisponible'), {code: 503})
    return response(10)
  }
  await loadChartSeriesProgressively({requests: [['volume', query('volume')]], initialSeries, load, onUpdate: value => { state = value }})
  t.is(calls, 1)
  t.is(state.errors.get('volume').code, 503)
  await loadChartSeriesProgressively({requests: [['volume', query('volume')]], initialSeries, load, onUpdate: value => { state = value }})
  t.is(calls, 2)
  t.deepEqual(state.series.get('volume'), response(10))
  t.is(state.errors.size, 0)
})

test('un refus SSR ou une promesse obsolète ne déclenche jamais un nouvel appel navigateur', async t => {
  for (const code of [401, 403, 400]) {
    let calls = 0
    await loadChartSeriesProgressively({requests: [['volume', query('volume')]],
      initialSeries: [{query: query('volume'), response: Promise.resolve({error: 'Refusé', code})}],
      load: async () => { calls++; return response(999) }, onUpdate: () => {}})
    t.is(calls, 0)
  }
  const controller = new AbortController()
  const initial = deferred()
  let calls = 0
  const loading = loadChartSeriesProgressively({requests: [['volume', query('volume')]],
    initialSeries: [{query: query('volume'), response: initial.promise}], signal: controller.signal,
    load: async () => { calls++; return response(999) }, onUpdate: () => {}})
  controller.abort()
  initial.reject(new Error('Indisponible'))
  await loading
  t.is(calls, 0)
})
