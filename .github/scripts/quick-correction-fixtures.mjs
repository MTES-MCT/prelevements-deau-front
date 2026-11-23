import {createHash} from 'node:crypto'

export const ids = {
  declaration: '26000000-0000-4000-8000-000000000001',
  source: '26000000-0000-4000-8000-000000000002',
  user: '26000000-0000-4000-8000-000000000003',
  row: '26000000-0000-4000-8000-000000000004',
  usage: '26000000-0000-4000-8000-000000000005',
  point: '26000000-0000-4000-8000-000000000006',
  exploitation: '26000000-0000-4000-8000-000000000007'
}

const sessions = new Map()
export const isQuickCorrectionFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-quick-correction-')
const pointName = 'Forage des Prés'
const original = {id: ids.row, pointName, compteurName: 'C-101', usageId: ids.usage, value: 125, readingDate: '2026-09-12',
  pointPrelevementId: ids.point, exploitationId: ids.exploitation}

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
    measurementType: state.measurementType, entries: state.entries}})
  const parts = []
  for await (const part of request) parts.push(part)
  const body = JSON.parse(Buffer.concat(parts))
  state.requests.push({path: pathname, body})
  if (pathname.endsWith('/contact')) return respond(200, {success: true})
  const {previewToken: supplied, ...draft} = body
  const previewToken = createHash('sha256').update(JSON.stringify(draft)).digest('hex')
  if (pathname.endsWith('/preview')) {
    const entry = draft.entries[0]
    const day = entry?.readingDate ?? draft.readingDate ?? entry?.periodStartDate ?? draft.periodStartDate
    const warning = {pointName, exploitationId: ids.exploitation, pointPrelevementId: ids.point, message: 'Index supérieur au relevé suivant du 11/09/2026.'}
    if (day === '2026-09-09') await new Promise(resolve => setTimeout(resolve, 700))
    return respond(200, {success: true, data: {previewToken, changes: [{pointName, exploitationId: ids.exploitation,
      pointPrelevementId: ids.point, periodStartDate: day ?? '2026-09-12', periodEndDate: entry?.periodEndDate ?? draft.periodEndDate ?? '2026-09-16',
      before: 25, after: entry ? entry.value : null}], warnings: ['2026-09-09', '2026-09-10'].includes(day) ? [warning] : []}})
  }
  if (supplied !== previewToken) return respond(409, {message: 'Aperçu périmé.'})
  Object.assign(state, {entries: draft.entries.map(row => ({...row, pointName})), measurementType: draft.measurementType, revision: state.revision + 1})
  return respond(200, {success: true, data: {...common, revision: state.revision}})
}
