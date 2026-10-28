// Synthetic values only; no database, outbound requests or mutation endpoints.
export const nativeIds = {source: '16161616-1616-4616-8616-161616161601', declaration: '16161616-1616-4616-8616-161616161602'}
export const isNativeDeclarationFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-native-declaration-')
const requests = new Map()
const mapRequests = new Map()

export async function handleNativeDeclarationFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isNativeDeclarationFixture(authorization)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = data => {send(200, data); return true}
  const role = authorization.includes('-ADMIN-') ? 'ADMIN' : authorization.includes('-DECLARANT-') ? 'DECLARANT' : 'INSTRUCTOR'
  if (!requests.has(authorization)) requests.set(authorization, [])
  if (!mapRequests.has(authorization)) mapRequests.set(authorization, [])
  if (pathname === '/api/__native-values-requests') return respond(requests.get(authorization))
  if (pathname === '/api/__native-map-requests') return respond(mapRequests.get(authorization))
  if (pathname === '/info' || pathname === '/api/info') return respond({role, declarantRole: 'PRELEVEUR', permissions: ['declaration.list', 'declaration.read'], user: {id: 'synthetic-user', email: 'native@example.test'}, expiresAt: new Date(Date.now() + 3600000).toISOString()})
  const declaration = {id: nativeIds.declaration, code: 'REUN01', type: 'aep-zre', dataSourceType: 'SPREADSHEET', processingStatus: 'COMPLETED', createdAt: '2026-10-19T12:00:00.000Z', declarant: {id: 'synthetic-user', socialReason: 'Régie synthétique'}, files: []}
  const source = {id: nativeIds.source, type: 'DECLARATION', status: 'COMPLETED', globalInstructionStatus: 'VALIDATED', metadata: {nativeTemporal: true},
    chunks: ['volume', 'température'].map((parameter, index) => ({id: `native-${index}`, instructionStatus: 'AUTOMATICALLY_VALIDATED', canReconcile: false,
      pointPrelevementId: 'synthetic-point', pointPrelevement: {id: 'synthetic-point', name: 'Forage synthétique', flowType: 'PRELEVEMENT'},
      metadata: {nativeTemporal: true, parameter, frequency: index ? 'instant' : '1 month', unit: index ? 'degrés Celsius' : 'm³'}, minDate: '2026-01-01', maxDate: '2026-01-31', _count: {chunkValues: index ? 51 : 1}, chunkValues: []}))}
  if (authorization.includes('-historical-replay-') || authorization.includes('-ordinary-replay-')) {
    declaration.files = [{id: 'synthetic-file', filename: 'Mesures.xlsx', url: 'https://127.0.0.1:3443/synthetic-file.xlsx'}]
    if (authorization.includes('-historical-replay-')) Object.assign(source.metadata, {provenance: 'DN', historicalAccepted: true})
  }
  if (authorization.includes('-association-warning-')) {
    for (const chunk of source.chunks) {
      chunk.instructionStatus = 'PENDING'
      chunk.exploitationId = null
      chunk.parsingInfo = {issues: [{code: 'EXPLOITATION_PERIOD_NOT_COVERED', severity: 'warning'}]}
    }
    source.chunks[1].instructionStatus = 'REJECTED'
    source.chunks[1].parsingInfo.issues.push({code: 'OVERLAPPING_SERIES', severity: 'error'})
  }
  if (authorization.includes('-readonly-map-')) {
    for (const chunk of source.chunks) {
      chunk.pointPrelevement.coordinates = {type: 'Point', coordinates: [55.5, -21]}
    }
    if (authorization.includes('-missing-point-')) {
      source.chunks[1].pointPrelevementId = null
      source.chunks[1].pointPrelevement = null
    }
  }
  if (pathname === `/api/sources/${nativeIds.source}`) return respond({success: true, data: {...source, declaration}})
  if (pathname === `/api/declarations/${nativeIds.declaration}`) return respond({success: true, data: {...declaration, source}})
  if (pathname === `/api/declarations/${nativeIds.declaration}/available-points-prelevements`) {
    mapRequests.get(authorization).push(pathname)
    return respond({success: true, data: []})
  }
  if (pathname === '/api/sources/me') return respond({success: true, data: {items: [{...source, declaration}], pagination: {page: 1, pageSize: 25, total: 1}}})
  if (pathname.endsWith('/values') && pathname.startsWith(`/api/sources/${nativeIds.source}/chunks/`)) {
    requests.get(authorization).push(Object.fromEntries(searchParams))
    const volume = pathname.includes('/native-0/')
    const offset = searchParams.get('cursor') ? 50 : 0
    return respond({success: true, data: {total: volume ? 1 : 51, nextCursor: volume || offset ? null : 'last-49',
      data: Array.from({length: volume || offset ? 1 : 50}, (_, index) => ({id: `value-${offset + index}`,
        periodStart: volume ? '2025-12-31T20:00:00.000Z' : '2026-01-01T00:01:23.000Z',
        periodEnd: volume ? '2026-01-31T20:00:00.000Z' : '2026-01-01T00:01:23.000Z',
        value: offset ? '999.000000000000001' : '0.123456789012345', unit: volume ? 'm³' : 'degrés Celsius', remark: volume ? 'Volume du mois' : 'Mesure originale'}))}})
  }
  return false
}
