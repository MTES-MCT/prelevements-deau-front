// Synthetic chart scope, independent of real points and timeseries.
export const chartSeriesIds = {
  collecteur: '91111111-1111-4111-8111-111111111111',
  forbidden: '92222222-2222-4222-8222-222222222222'
}
const requests = new Map()
export const isChartSeriesFixture = authorization => /^Bearer browser-test-chart-series-/.test(authorization ?? '')

export async function handleChartSeriesFixtureRequest(request, send) {
  const authorization = request.headers.authorization
  if (!isChartSeriesFixture(authorization)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, data) => { send(status, data); return true }
  const record = value => {
    requests.set(authorization, [...(requests.get(authorization) ?? []), value])
    return value
  }
  if (pathname === '/api/__chart-series-requests') return respond(200, requests.get(authorization) ?? [])
  if (pathname === '/info' || pathname === '/api/info') return respond(200, {
    role: 'ADMIN', permissions: [], user: {id: chartSeriesIds.collecteur, email: 'chart@example.test'}, expiresAt: new Date(Date.now() + 3_600_000).toISOString()
  })
  if (pathname === '/api/users/me/zones') return respond(200, [])
  if (pathname === `/api/declarants/${chartSeriesIds.collecteur}/overview`) return respond(200, {
    id: chartSeriesIds.collecteur, userId: chartSeriesIds.collecteur, declarantRole: 'COLLECTEUR',
    declarantType: 'LEGAL_PERSON', socialReason: 'Collecteur du graphique synthétique',
    pointPrelevements: [], collecteurExploitations: [], right: {permissions: []}
  })
  if (pathname.startsWith('/api/audit-history/')) return respond(200, {data: [], meta: {total: 0}})
  if (pathname === '/api/aggregated-series/options') {
    record({path: pathname, query: Object.fromEntries(searchParams), method: request.method})
    return respond(200, {parameters: [
      {id: 'volume:PRELEVEMENT', name: 'volume', metricTypeCode: 'volume', label: 'Volume prélevé', flowType: 'PRELEVEMENT', unit: 'm³', valueType: 'cumulative', temporalOperators: ['sum', 'max'], defaultTemporalOperator: 'sum'},
      {id: 'débit:PRELEVEMENT', name: 'débit', metricTypeCode: 'débit', label: 'Débit prélevé', flowType: 'PRELEVEMENT', unit: 'm³/h', valueType: 'instantaneous', temporalOperators: ['mean'], defaultTemporalOperator: 'mean'}
    ].map(parameter => ({...parameter, minDate: '2020-01-01', maxDate: '2026-09-01', availableFrequencies: ['1 day', '1 week', '1 year']}))})
  }
  if (pathname === '/api/aggregated-series') {
    const entry = record({path: pathname, query: Object.fromEntries(searchParams), method: request.method, startedAt: Date.now()})
    if (searchParams.get('collecteurId') === chartSeriesIds.forbidden) return respond(403, {message: 'Périmètre interdit'})
    await new Promise(resolve => setTimeout(resolve, 100))
    entry.completedAt = Date.now()
    const isTotal = searchParams.get('aggregationFrequency') === '1 year'
    const isVolume = searchParams.get('metricTypeCode') === 'volume'
    return respond(200, {
      metadata: {frequency: searchParams.get('aggregationFrequency'), unit: isVolume ? 'm³' : 'm³/h', valueType: isVolume ? 'cumulative' : 'instantaneous', exactVolumesEstimated: isVolume},
      values: isTotal
        ? [{date: searchParams.get('startDate'), value: 77}]
        : [{date: '2020-01-01', value: isVolume ? 100 : 10}, {date: '2026-09-01', value: isVolume ? 200 : 20}]
    })
  }
  return false
}
