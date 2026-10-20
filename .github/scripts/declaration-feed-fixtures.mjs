// A virtual 140,000-entry history: only the requested page is materialized.
const sessions = new Map()
export const isDeclarationFeedFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-declaration-feed-')

function createEntry(index) {
  const id = `${String(index + 100000).padStart(8, '0')}-1515-4515-8515-151515151502`
  const createdAt = '2026-10-19T12:00:00.000Z'
  const source = {
    id, type: 'API', status: 'COMPLETED', globalInstructionStatus: 'VALIDATED', createdAt,
    readOnly: true, canEdit: false, canDelete: false,
    declarant: {id: 'synthetic-preleveur', socialReason: 'Préleveur de la page'},
    chunks: [{id: `chunk-${index}`, pointPrelevementId: 'synthetic-point', pointPrelevement: {id: 'synthetic-point', name: `Point synthétique ${index}`, flowType: 'PRELEVEMENT'}, minDate: '2026-07-01', maxDate: '2026-07-31'}]
  }
  return {id: `telemetry-${id}`, kind: 'TELEMETRY', createdAt, source, declaration: {id, dataSourceType: 'API', createdAt}, url: `/mes-declarations/sources/${id}`}
}

export async function handleDeclarationFeedFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isDeclarationFeedFixture(authorization)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, data) => {send(status, data); return true}
  const collector = !authorization.includes('-preleveur-')
  if (!sessions.has(authorization)) sessions.set(authorization, {requests: [], failed: false})
  const state = sessions.get(authorization)
  if (pathname === '/api/__declaration-feed-requests') return respond(200, state.requests)
  if (pathname === '/info' || pathname === '/api/info') {
    return respond(200, {role: 'DECLARANT', declarantRole: collector ? 'COLLECTEUR' : 'PRELEVEUR', permissions: [], user: {id: 'synthetic-user', email: 'feed@example.test'}, expiresAt: new Date(Date.now() + 3600000).toISOString()})
  }
  if (pathname === '/api/campaigns/invitations') return respond(200, {success: true, data: []})
  if (pathname !== '/api/declarations/me/feed') return false
  state.requests.push(Object.fromEntries(searchParams))
  // Fail immediately if the UI reintroduces the expensive count on initial load.
  if (searchParams.get('includeCounts') !== 'false') return respond(503, {message: 'Le comptage global est indisponible.'})
  if (authorization.includes('-retry-') && searchParams.has('cursor') && !state.failed) {
    state.failed = true
    return respond(503, {message: 'Page temporairement indisponible.'})
  }
  const limit = Math.min(100, Number(searchParams.get('limit') || 25))
  const offset = Number(searchParams.get('cursor')?.replace('offset-', '') || 0)
  const empty = searchParams.has('kinds') && searchParams.get('kinds') === ''
  const filtered = Boolean(searchParams.get('declarationCode'))
  const total = empty ? 0 : filtered ? 1 : 140000
  const count = Math.min(limit, Math.max(0, total - offset))
  const data = Array.from({length: count}, (_, index) => createEntry(filtered ? 139999 : offset + index))
  return respond(200, {
    success: true, data,
    meta: {
      total: null, countsByKind: null,
      declarantRole: collector ? 'COLLECTEUR' : 'PRELEVEUR',
      canCreateDeclaration: false, canCreateQuickDeclaration: !collector,
      pagination: {limit, hasNext: offset + count < total, nextCursor: offset + count < total ? `offset-${offset + count}` : null}
    }
  })
}
