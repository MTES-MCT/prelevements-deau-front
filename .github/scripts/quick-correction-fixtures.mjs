import {createHash, randomUUID} from 'node:crypto'

export const ids = {
  declaration: '26000000-0000-4000-8000-000000000001',
  source: '26000000-0000-4000-8000-000000000002',
  user: '26000000-0000-4000-8000-000000000003',
  row: '26000000-0000-4000-8000-000000000004',
  usage: '26000000-0000-4000-8000-000000000005',
  point: '26000000-0000-4000-8000-000000000006',
  exploitation: '26000000-0000-4000-8000-000000000007',
  secondExploitation: '26000000-0000-4000-8000-000000000008',
  secondPoint: '26000000-0000-4000-8000-000000000009',
  secondRow: '26000000-0000-4000-8000-000000000010'
}

const sessions = new Map()
export const isQuickCorrectionFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-quick-correction-')
const pointName = 'Forage des Prés'
const original = {id: ids.row, pointName, countingCode: '001', compteurName: 'C-101', usageId: ids.usage, value: 125, readingDate: '2026-09-12',
  pointPrelevementId: ids.point, exploitationId: ids.exploitation}
const countings = [ids.exploitation, ids.secondExploitation].map((exploitationId, index) => ({
  pointPrelevementId: ids.point, exploitationId, pointName, countingCode: index ? '002' : '001', usageId: ids.usage,
  usageLabel: 'Irrigation', compteurName: null, compteurId: null
}))

export async function handleQuickCorrectionFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isQuickCorrectionFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://localhost')
  const role = authorization.includes('-ADMIN-') ? 'ADMIN' : authorization.includes('-INSTRUCTOR-') ? 'INSTRUCTOR' : 'DECLARANT'
  const declarantRole = authorization.includes('-collector-') ? 'COLLECTEUR' : 'PRELEVEUR'
  const isFile = authorization.includes('-file-')
  const multipoint = authorization.includes('-multi-')
  const mixedDates = authorization.includes('-legacy-')
  const formEntries = multipoint ? [countings[0], {...countings[1], pointPrelevementId: ids.secondPoint, pointName: 'Puits du Moulin'}] : authorization.includes('-fixed-') ? countings : [countings[0]]
  const initialEntries = multipoint ? [original, {...formEntries[1], id: ids.secondRow, value: 230,
    readingDate: mixedDates ? '2026-09-13' : original.readingDate}] : [original]
  const state = sessions.get(authorization) ?? {revision: 0, measurementType: 'INDEX', entries: initialEntries, requests: []}
  sessions.set(authorization, state)
  const respond = (status, value) => {send(status, value); return true}
  if (pathname === '/api/__quick-correction') return respond(200, state)
  if (['/info', '/api/info'].includes(pathname)) return respond(200, {role, declarantRole, permissions: [],
    user: {id: ids.user, email: 'correction@example.test'}, expiresAt: new Date(Date.now() + 3600000).toISOString()})
  const base = `/api/declarations/${ids.declaration}`
  const sourcePath = `/api/sources/${ids.source}`
  const common = {id: ids.declaration, sourceId: ids.source, code: 'PE-2026', createdAt: '2026-09-13T00:00:00Z'}
  if (pathname === base || pathname === sourcePath) {
    if (isFile) {
      const declaration = {...common, dataSourceType: 'SPREADSHEET', processingStatus: 'COMPLETED',
        files: [{id: '26000000-0000-4000-8000-000000000011', name: 'declaration.xlsx'}]}
      const source = {id: ids.source, type: 'DECLARATION', status: 'COMPLETED', metadata: {}, chunks: []}
      return respond(200, {success: true, data: pathname === base ? {...declaration, source} : {...source, declaration}})
    }
    const declaration = {...common, dataSourceType: 'MANUAL', type: 'quick-declaration', processingStatus: 'COMPLETED', files: []}
    const source = {id: ids.source, type: 'DECLARATION', status: 'COMPLETED', globalInstructionStatus: 'VALIDATED',
      metadata: {manualQuickDeclaration: true, measurementType: state.measurementType, entriesCount: state.entries.length,
        quickModifiedAt: state.revision ? '2026-09-20T00:00:00Z' : null}, chunks: []}
    return respond(200, {success: true, data: pathname === base ? {...declaration, source} : {...source, declaration}})
  }
  if (pathname !== `${base}/quick` && pathname !== `${base}/quick/preview` && pathname !== '/api/declarations/quick/contact') return false
  if (isFile) return respond(404, {message: 'Saisie en ligne introuvable.'})
  if (role === 'INSTRUCTOR' || authorization.includes('-collector-denied-')) return respond(403, {message: 'Droits insuffisants.'})
  if (request.method === 'GET') {
    const emptyEntries = state.entries.length ? formEntries.filter(slot => !state.entries.some(row => row.exploitationId === slot.exploitationId)) : []
    const mapPoints = state.entries.length ? [...new Map(formEntries.map(slot => [slot.pointPrelevementId, {
      id: slot.pointPrelevementId, pointPrelevementId: slot.pointPrelevementId, name: slot.pointName, flowType: 'PRELEVEMENT',
      coordinates: {type: 'Point', coordinates: slot.pointPrelevementId === ids.point ? [2.02, 46.12] : [2.06, 46.11]}
    }])).values()] : []
    return respond(200, {success: true, data: {...common, revision: state.revision, supportsReceiptRowOrder: true,
      measurementType: state.measurementType, entries: state.entries, emptyEntries, mapPoints}})
  }
  const parts = []
  for await (const part of request) parts.push(part)
  const body = JSON.parse(Buffer.concat(parts))
  state.requests.push({path: pathname, body})
  if (pathname.endsWith('/contact')) return respond(200, {success: true})
  const {previewToken: supplied, ...draft} = body
  if (draft.entries.some(input => !formEntries.some(slot => slot.exploitationId === input.exploitationId && slot.pointPrelevementId === input.pointPrelevementId))) {
    return respond(403, {message: 'Ce comptage ne figure pas sur le formulaire initial.'})
  }
  const previewToken = createHash('sha256').update(JSON.stringify(draft)).digest('hex')
  const dates = draft.measurementType === 'INDEX' ? {readingDate: draft.readingDate}
    : {periodStartDate: draft.periodStartDate, periodEndDate: draft.periodEndDate}
  if (draft.entries.length && Object.values(dates).some(date => !date)
    || draft.entries.some(row => ['readingDate', 'periodStartDate', 'periodEndDate'].some(key => key in row))) {
    return respond(400, {message: 'Les dates sont attendues sur la déclaration.'})
  }
  if (pathname.endsWith('/preview')) {
    const day = draft.readingDate
    const changes = []
    const warnings = []
    for (const available of formEntries) {
      const previous = state.entries.find(row => row.exploitationId === available.exploitationId)
      const current = draft.entries.find(row => row.exploitationId === available.exploitationId)
      if (!previous && !current) continue
      if (current && ['2026-09-09', '2026-09-10'].includes(day)) {
        warnings.push({code: 'INDEX_ABOVE_NEXT', pointName: available.pointName, pointPrelevementId: available.pointPrelevementId,
          exploitationId: available.exploitationId, readingDate: day, value: current.value, neighborDate: '2026-09-11',
          neighborValue: 100, message: 'Index supérieur au relevé suivant (100 m³ le 11/09/2026).'})
      }
      const measurement = current ? dates : previous
      changes.push({pointName: available.pointName, exploitationId: available.exploitationId, pointPrelevementId: available.pointPrelevementId,
        periodStartDate: measurement.readingDate ?? measurement.periodStartDate,
        periodEndDate: measurement.readingDate ?? measurement.periodEndDate,
        before: previous ? 25 : null, after: current?.value ?? null})
    }
    // The API can return the affected points in a different order from the form.
    return respond(200, {success: true, data: {previewToken, changes, warnings: warnings.reverse()}})
  }
  if (supplied !== previewToken) return respond(409, {message: 'Aperçu périmé.'})
  const entries = draft.entries.map(row => {
    const available = formEntries.find(entry => entry.exploitationId === row.exploitationId)
    const originalRow = state.entries.find(entry => entry.id === row.id)
    return {...available, ...row, ...dates, compteurName: originalRow?.compteurName ?? null, id: row.id ?? randomUUID()}
  })
  Object.assign(state, {entries, measurementType: draft.measurementType, revision: state.revision + 1})
  return respond(200, {success: true, data: {...common, revision: state.revision}})
}
