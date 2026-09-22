// Synthetic, isolated by token: no database, network, notifications or jobs.
export const countingIds = {
  user: '81111111-1111-4111-8111-111111111111',
  point: '82222222-2222-4222-8222-222222222222',
  first: '83333333-3333-4333-8333-333333333333',
  second: '84444444-4444-4444-8444-444444444444',
  usage: '85555555-5555-4555-8555-555555555555',
  declaration: '86666666-6666-4666-8666-666666666666',
  source: '88888888-8888-4888-8888-888888888888',
  chunk: '87777777-7777-4777-8777-777777777777'
}
const requests = new Map()
const countingCodes = new Map()
const reconciliations = new Map()
const usage = {id: countingIds.usage, code: '2', kind: 'USAGE', label: 'Irrigation', children: []}

export function isCountingFixture(authorization) {
  return /^Bearer browser-test-counting-/.test(authorization ?? '')
}

export async function handleCountingFixtureRequest(request, send) {
  const authorization = request.headers.authorization
  if (!isCountingFixture(authorization)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, data) => { send(status, data); return true }
  const record = value => requests.set(authorization, [...(requests.get(authorization) ?? []), value])
  const readOnly = authorization.includes('-readonly-')
  const firstCode = countingCodes.has(authorization) ? countingCodes.get(authorization) : '001'
  if (pathname === '/info' || pathname === '/api/info') {
    return respond(200, {role: readOnly ? 'DECLARANT' : 'ADMIN', permissions: [], user: {id: countingIds.user, email: 'counting@example.test'}, expiresAt: new Date(Date.now() + 3_600_000).toISOString()})
  }

  if (pathname === '/api/__counting-requests') return respond(200, requests.get(authorization) ?? [])
  if (pathname === '/api/users/me/zones') return respond(200, [])
  if (pathname === '/api/referentiels/usages-eau') return respond(200, {items: [usage]})
  if (pathname === '/api/declarations/allowed-types') {
    return respond(200, {success: true, data: [], meta: {declarantRole: 'PRELEVEUR', quickDeclarationEnabled: true, canCreateQuickDeclaration: true}})
  }

  if (pathname === `/api/declarations/${countingIds.declaration}` || pathname === `/api/sources/${countingIds.source}`) {
    const exploitationId = reconciliations.get(authorization)
    const chunk = {
      id: countingIds.chunk, pointPrelevementName: 'Point du fichier', minDate: '2026-01-01', maxDate: '2026-01-31',
      metricType: {code: 'volume'}, parameter: 'volume', unit: 'm³', frequency: '1 month', canReconcile: true,
      instructionStatus: exploitationId ? 'VALIDATED' : 'PENDING', chunkValues: [], valuesCount: 0,
      ...(exploitationId ? {pointPrelevementId: countingIds.point, exploitationId, exploitation: {id: exploitationId, countingCode: '002'}, pointPrelevement: {id: countingIds.point, name: 'Point partagé'}, pointAssociationOrigin: 'MANUAL'} : {})
    }
    const declaration = {
      id: countingIds.declaration, code: 'SYNTH-001', createdAt: '2026-09-22T12:00:00Z', dataSourceType: 'SPREADSHEET', type: 'template-file',
      declarationType: {name: 'Modèle PE'}, canReconcile: true, files: []
    }
    const source = {id: countingIds.source, type: 'DECLARATION', status: 'COMPLETED', globalInstructionStatus: exploitationId ? 'VALIDATED' : 'PENDING', canReconcile: true, chunks: [chunk]}
    return respond(200, {success: true, data: pathname.startsWith('/api/sources/') ? {...source, declaration} : {...declaration, source}})
  }

  if (pathname === `/api/declarations/${countingIds.declaration}/available-points-prelevements`) {
    return respond(200, {success: true, data: [{id: countingIds.point, name: 'Point partagé', flowType: 'PRELEVEMENT', exploitations: [
      {id: countingIds.first, countingCode: '001', startDate: '2026-01-01'},
      {id: countingIds.second, countingCode: '002', startDate: '2026-01-01'}
    ]}]})
  }

  if (pathname === `/api/declarations/${countingIds.declaration}/chunks/${countingIds.chunk}/reconcile`) {
    const parts = []
    for await (const part of request) parts.push(part)
    const body = JSON.parse(Buffer.concat(parts).toString())
    record({path: pathname, body})
    reconciliations.set(authorization, body.exploitationId)
    return respond(200, {success: true, data: {...body, globalInstructionStatus: 'VALIDATED', pointAssociationOrigin: 'MANUAL'}})
  }

  if (pathname === '/api/declarations/quick/context') {
    return respond(200, {success: true, data: {points: [countingIds.first, countingIds.second].map((id, index) => ({
      id: countingIds.point, pointPrelevementId: countingIds.point, exploitationId: id,
      name: 'Point partagé', countingCode: index ? '002' : firstCode, usage, flowType: 'PRELEVEMENT',
      lastReading: {value: index ? 900 : 100, date: '2026-09-01', unit: 'm³'}
    })), usageOptions: [usage]}})
  }

  if (pathname === '/api/declarations/quick' || pathname === '/api/declarations/quick/conflicts') {
    const parts = []
    for await (const part of request) parts.push(part)
    record({path: pathname, body: JSON.parse(Buffer.concat(parts).toString())})
    // The safe synthetic error keeps the filled-in form visible for assertions.
    return pathname.endsWith('/conflicts')
      ? respond(200, {success: true, data: {conflicts: []}})
      : respond(409, {message: 'Soumission synthétique enregistrée sans donnée métier.'})
  }

  if (pathname === `/api/exploitations/${countingIds.first}`) {
    if (request.method === 'PUT') {
      if (readOnly) return respond(403, {message: 'Lecture seule'})
      const parts = []
      for await (const part of request) parts.push(part)
      const body = JSON.parse(Buffer.concat(parts).toString())
      record({path: pathname, body})
      countingCodes.set(authorization, body.countingCode)
    }

    return respond(200, {
      id: countingIds.first, countingCode: countingCodes.has(authorization) ? countingCodes.get(authorization) : firstCode,
      status: 'EN_ACTIVITE', startDate: '2026-01-01', usageId: usage.id, usage, secondaryUsages: [], connectors: [], collecteurs: [],
      declarant: {id: countingIds.user, socialReason: 'Préleveur synthétique'},
      pointPrelevement: {id: countingIds.point, name: 'Point partagé', flowType: 'PRELEVEMENT'},
      right: {canEdit: !readOnly, permissions: []}
    })
  }

  if (pathname.endsWith('/meter-allocations')) return respond(200, {meterAllocations: []})
  if (pathname === `/api/points-prelevement/${countingIds.point}`) return respond(200, {id: countingIds.point, name: 'Point partagé', flowType: 'PRELEVEMENT', right: {permissions: []}})
  if (pathname === `/api/points-prelevement/${countingIds.point}/exploitations`) return respond(200, [])
  if (pathname.endsWith('/documents') || pathname.endsWith('/regles')) return respond(200, [])
  if (pathname.startsWith('/api/audit-history/')) return respond(200, {data: [], meta: {total: 0}})
  if (pathname === '/api/aggregated-series/options') {
    record({path: pathname, query: Object.fromEntries(searchParams)})
    return respond(200, {parameters: [
      {id: 'volume:PRELEVEMENT', name: 'volume', metricTypeCode: 'volume', label: 'Volume prélevé', unit: 'm³', valueType: 'cumulative', minDate: '2026-09-01', maxDate: '2026-09-02', temporalOperators: ['sum'], defaultTemporalOperator: 'sum', availableFrequencies: ['1 day']},
      ...[countingIds.first, countingIds.second].filter(id => !searchParams.has('exploitationId') || searchParams.get('exploitationId') === id).map((id, index) => ({
        id: `index:PRELEVEMENT:exploitation:${id}`, exploitationId: id, countingCode: index ? '002' : firstCode,
        name: 'index', metricTypeCode: 'index', label: `Index de prélèvement — Comptage ${index ? '002' : firstCode}`, unit: 'm³', valueType: 'instantaneous', minDate: '2026-09-01', maxDate: '2026-09-02', temporalOperators: ['max'], defaultTemporalOperator: 'max', availableFrequencies: ['1 day']
      }))
    ]})
  }

  if (pathname === '/api/aggregated-series') {
    record({path: pathname, query: Object.fromEntries(searchParams)})
    return respond(200, {metricTypeCode: 'volume', unit: 'm³', frequency: '1 day', valueType: 'cumulative', values: []})
  }

  return false
}
