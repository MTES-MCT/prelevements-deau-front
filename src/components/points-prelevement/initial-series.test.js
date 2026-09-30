import test from 'ava'
import {buildInitialChartRequests, mergeDetailedSeriesOptions, preloadInitialChartSeries, resolveDefaultSeriesParameterIds} from './initial-series.js'

const parameters = [
  {id: 'volume:PRELEVEMENT', name: 'volume', flowType: 'PRELEVEMENT', minDate: '2020-01-01', maxDate: '2026-09-01', temporalOperators: ['sum'], defaultTemporalOperator: 'sum', availableFrequencies: ['1 day', '1 week', '1 year']},
  {id: 'débit:PRELEVEMENT', name: 'débit', flowType: 'PRELEVEMENT', minDate: '2021-01-01', maxDate: '2025-01-01', temporalOperators: ['mean'], defaultTemporalOperator: 'mean', availableFrequencies: ['1 day', '1 week', '1 year']}
]

test('le préchargement utilise les mêmes paramètres, dates communes et fréquence que le graphe', t => {
  const requests = buildInitialChartRequests({parameters, collecteurId: 'collector', pointIds: ['b', 'a', 'b']})
  t.deepEqual(requests.map(request => request.parameterId), resolveDefaultSeriesParameterIds(parameters))
  t.is(requests.length, 2)
  for (const request of requests) {
    const query = Object.fromEntries(new URLSearchParams(request.query))
    t.like(query, {collecteurId: 'collector', pointIds: 'a,b', startDate: '2020-01-01', endDate: '2026-09-01', aggregationFrequency: '1 week', view: 'chart'})
    t.is(query.temporalOperator, query.metricTypeCode === 'volume' ? 'sum' : 'mean')
  }
})

test('les bornes explicites et les séries par exploitation sont conservées', t => {
  const indexed = [{id: 'index:exploitation', name: 'index', exploitationId: 'exploitation', minDate: '2020-01-01', maxDate: '2026-09-01', temporalOperators: ['max'], defaultTemporalOperator: 'max'}]
  const [request] = buildInitialChartRequests({parameters: indexed, preleveurId: 'owner', startDate: '2026-01-01', endDate: '2026-03-01'})
  t.like(Object.fromEntries(new URLSearchParams(request.query)), {preleveurId: 'owner', exploitationId: 'exploitation', metricTypeCode: 'index', aggregationFrequency: '1 day', temporalOperator: 'max', startDate: '2026-01-01', endDate: '2026-03-01'})
  t.deepEqual(buildInitialChartRequests({parameters: [{...indexed[0], readingSeries: true}]}), [])
})

test('les index ajoutés ne changent ni la sélection par défaut ni les bornes déjà chargées', t => {
  const initial = {parameters, detailsDeferred: true, initialSeries: []}
  const merged = mergeDetailedSeriesOptions(initial, {parameters: [{...parameters[0], minDate: '2014-01-01'}, {id: 'index:one', name: 'index', minDate: '2010-01-01'}]})
  t.is(merged.parameters[0], parameters[0])
  t.is(merged.initialSeries, initial.initialSeries)
  t.false(merged.detailsDeferred)
  t.is(merged.parameters.length, 3)
  t.deepEqual(resolveDefaultSeriesParameterIds(merged.parameters), resolveDefaultSeriesParameterIds(parameters))
  t.deepEqual(buildInitialChartRequests({...merged}), buildInitialChartRequests(initial))
})

test('le préchargement démarre immédiatement et renvoie des promesses indépendantes', async t => {
  const volume = Promise.withResolvers()
  const debit = Promise.withResolvers()
  const calls = []
  const initial = preloadInitialChartSeries({parameters}, query => {
    calls.push(query)
    return calls.length === 1 ? volume.promise : debit.promise
  })
  t.is(calls.length, 2)
  let debitReady = false
  initial[1].response.then(() => { debitReady = true })
  volume.resolve({values: [{value: 10}]})
  t.deepEqual(await initial[0].response, {values: [{value: 10}]})
  t.false(debitReady)
  debit.reject(Object.assign(new Error('Détail interne confidentiel'), {code: 403}))
  t.deepEqual(await initial[1].response, {code: 403, error: 'Vous ne pouvez pas consulter les données de ce périmètre.'})
})
