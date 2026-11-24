import {createHash, randomUUID} from 'node:crypto'

export const ids = {
  declaration: '26000000-0000-4000-8000-000000000001',
  source: '26000000-0000-4000-8000-000000000002',
  user: '26000000-0000-4000-8000-000000000003',
  row: '26000000-0000-4000-8000-000000000004',
  usage: '26000000-0000-4000-8000-000000000005',
  point: '26000000-0000-4000-8000-000000000006',
  exploitation: '26000000-0000-4000-8000-000000000007',
  secondExploitation: '26000000-0000-4000-8000-000000000008'
}

const sessions = new Map()
export const isQuickCorrectionFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-quick-correction-')
const pointName = 'Forage des Prés'
const original = {id: ids.row, pointName, countingCode: '001', compteurName: 'C-101', usageId: ids.usage, value: 125, readingDate: '2026-09-12',
  pointPrelevementId: ids.point, exploitationId: ids.exploitation}
const availableEntries = [ids.exploitation, ids.secondExploitation].map((exploitationId, index) => ({
  pointPrelevementId: ids.point, exploitationId, pointName, countingCode: index ? '002' : '001', usageId: ids.usage,
  usageLabel: 'Irrigation', compteurName: null, compteurId: null
}))

export async function handleQuickCorrectionFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isQuickCorrectionFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://localhost')
  const role = authorization.includes('-ADMIN-') ? 'ADMIN' : authorization.includes('-INSTRUCTOR-') ? 'INSTRUCTOR' : 'DECLARANT'
  const state = sessions.get(authorization) ?? {revision: 0, measurementType: 'INDEX', entries: [original], requests: []}
  sessions.set(authorization, state)
  const respond = (status, value) => {send(status, value); return true}
  if (pathname === '/api/__quick-correction') return respond(200, state)
  if (['/info', '/api/info'].includes(pathname)) return respond(200, {role, declarantRole: 'PRELEVEUR', permissions: [],
    user: {id: ids.user, email: 'correction@example.test'}, expiresAt: new Date(Date.now() + 3600000).toISOString()})
  const base = `/api/declarations/${ids.declaration}`
  const sourcePath = `/api/sources/${ids.source}`
  const common = {id: ids.declaration, sourceId: ids.source, code: 'PE-2026', createdAt: '2026-09-13T00:00:00Z'}
  if (pathname === base || pathname === sourcePath) {
    const declaration = {...common, dataSourceType: 'MANUAL', type: 'quick-declaration', processingStatus: 'COMPLETED', files: []}
    const source = {id: ids.source, type: 'DECLARATION', status: 'COMPLETED', globalInstructionStatus: 'VALIDATED',
      metadata: {manualQuickDeclaration: true, measurementType: state.measurementType, entriesCount: state.entries.length,
        quickModifiedAt: state.revision ? '2026-09-20T00:00:00Z' : null}, chunks: []}
    return respond(200, {success: true, data: pathname === base ? {...declaration, source} : {...source, declaration}})
  }
  if (pathname !== `${base}/quick` && pathname !== `${base}/quick/preview` && pathname !== '/api/declarations/quick/contact') return false
  if (role === 'INSTRUCTOR') return respond(403, {message: 'Droits insuffisants.'})
  if (request.method === 'GET') return respond(200, {success: true, data: {...common, revision: state.revision,
    measurementType: state.measurementType, entries: state.entries, availableEntries}})
  const parts = []
  for await (const part of request) parts.push(part)
  const body = JSON.parse(Buffer.concat(parts))
  state.requests.push({path: pathname, body})
  if (pathname.endsWith('/contact')) return respond(200, {success: true})
  const {previewToken: supplied, ...draft} = body
  const previewToken = createHash('sha256').update(JSON.stringify(draft)).digest('hex')
  if (pathname.endsWith('/preview')) {
    const day = draft.entries[0]?.readingDate
    const warning = {pointName, exploitationId: ids.exploitation, pointPrelevementId: ids.point, message: 'Index supérieur au relevé suivant du 11/09/2026.'}
    if (day === '2026-09-09') await new Promise(resolve => setTimeout(resolve, 700))
    const changes = []
    for (const available of availableEntries) {
      const previous = state.entries.find(row => row.exploitationId === available.exploitationId)
      const current = draft.entries.find(row => row.exploitationId === available.exploitationId)
      if (!previous && !current) continue
      const measurement = current ?? previous
      changes.push({pointName, exploitationId: available.exploitationId, pointPrelevementId: ids.point,
        periodStartDate: measurement.readingDate ?? measurement.periodStartDate,
        periodEndDate: measurement.readingDate ?? measurement.periodEndDate,
        before: previous ? 25 : null, after: current?.value ?? null})
    }
    return respond(200, {success: true, data: {previewToken, changes, warnings: ['2026-09-09', '2026-09-10'].includes(day) ? [warning] : []}})
  }
  if (supplied !== previewToken) return respond(409, {message: 'Aperçu périmé.'})
  const entries = draft.entries.map(row => {
    const available = availableEntries.find(entry => entry.exploitationId === row.exploitationId)
    const originalRow = state.entries.find(entry => entry.id === row.id)
    return {...available, ...row, compteurName: originalRow?.compteurName ?? null, id: row.id ?? randomUUID()}
  })
  Object.assign(state, {entries, measurementType: draft.measurementType, revision: state.revision + 1})
  return respond(200, {success: true, data: {...common, revision: state.revision}})
}
