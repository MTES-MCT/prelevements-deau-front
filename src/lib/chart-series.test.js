import test from 'ava'

import {buildChartSeriesQuery, fetchChartSeries, loadChartSeries} from './chart-series.js'

const parameters = {preleveurId: 'preleveur', metricTypeCode: 'volume', aggregationFrequency: '1 week', temporalOperator: 'sum'}

test('la clé ignore ordre des champs, doublons de points et paramètres hors contrat', t => {
  const query = buildChartSeriesQuery({...parameters, pointIds: ['b', 'a', 'a'], view: 'full', token: 'secret'})
  t.is(query, buildChartSeriesQuery({pointIds: 'a,b', ...parameters}))
  const parsed = new URLSearchParams(query)
  t.is(parsed.get('view'), 'chart')
  t.false(parsed.has('token'))
  t.not(query, buildChartSeriesQuery({...parameters, pointIds: 'a,b', pointFlowType: 'REJET'}))
  t.not(query, buildChartSeriesQuery({...parameters, pointIds: 'a,b', temporalOperator: 'max'}))
})

test('lecture GET authentifiée même origine et sans cache conserve valeurs et avertissements', async t => {
  const controller = new AbortController()
  const expected = {metadata: {exactVolumesEstimated: true}, values: [{date: '2026-01-01', value: 0, remarks: ['Estimé']}]}
  const result = await fetchChartSeries(buildChartSeriesQuery(parameters), {
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      t.true(url.startsWith('/api/aggregated-series?'))
      t.is(options.signal, controller.signal)
      t.is(options.cache, 'no-store')
      t.is(options.credentials, 'same-origin')
      return Response.json(expected)
    }
  })
  t.deepEqual(result, expected)
})

for (const status of [401, 403, 422, 500]) {
  test(`le statut ${status} reste une erreur explicite, jamais une série vide`, async t => {
    await t.throwsAsync(() => fetchChartSeries('metricTypeCode=volume', {
      fetchImpl: async () => Response.json({message: 'Erreur métier'}, {status})
    }), {code: status})
  })
}

test('une réponse obsolète ne peut réussir après annulation, même si fetch ignore le signal', async t => {
  const controller = new AbortController()
  await t.throwsAsync(() => fetchChartSeries('metricTypeCode=volume', {
    signal: controller.signal,
    fetchImpl: async () => {
      controller.abort()
      return Response.json({values: [{value: 999}]})
    }
  }), {name: 'AbortError'})
})

test('l’annulation empêche de demander les pages d’index suivantes', async t => {
  const controller = new AbortController()
  let calls = 0
  await t.throwsAsync(() => loadChartSeries(buildChartSeriesQuery({meterId: 'meter', aggregationFrequency: 'instantaneous'}), {
    signal: controller.signal,
    fetchImpl: async () => {
      calls++
      controller.abort()
      return Response.json({metadata: {readingSeries: true}, values: [], nextCursor: 'next'})
    }
  }), {name: 'AbortError'})
  t.is(calls, 1)
})

test('les pages d’index conservent curseur, observations et dates exactes', async t => {
  const requested = []
  const result = await loadChartSeries(buildChartSeriesQuery({meterId: 'meter', aggregationFrequency: 'instantaneous'}), {
    fetchImpl: async url => {
      const query = new URL(url, 'https://example.test').searchParams
      requested.push(query)
      return Response.json({metadata: {readingSeries: true}, values: [{date: '2026-01-01', values: [{readingId: query.has('cursor') ? 'second' : 'first', observedAt: '2026-01-01T11:22:33.000Z', admissible: true}]}], nextCursor: query.has('cursor') ? null : 'next'})
    }
  })
  t.is(requested.length, 2)
  t.is(requested[1].get('cursor'), 'next')
  t.true(requested.every(query => query.get('view') === 'chart' && query.get('limit') === '5000'))
  t.is(result.values.length, 2)
  t.is(result.values[0].values[0].observedAt, '2026-01-01T11:22:33.000Z')
})

for (const status of [401, 403, 502]) {
  test(`une erreur HTML ${status} conserve son statut et un message utilisable`, async t => {
    const error = await t.throwsAsync(() => fetchChartSeries('metricTypeCode=volume', {
      fetchImpl: async () => new Response('<html>proxy error</html>', {status})
    }), {code: status})
    t.false(error instanceof SyntaxError)
    t.false(error.message.includes('<html>'))
  })
}
