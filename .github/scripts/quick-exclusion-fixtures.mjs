// Synthetic exploitation settings, isolated by session; no real data or jobs.
export const quickExclusionIds = {
  user: '61111111-1111-4111-8111-111111111111',
  point: '62222222-2222-4222-8222-222222222222',
  first: '63333333-3333-4333-8333-333333333333',
  second: '64444444-4444-4444-8444-444444444444',
  usage: '65555555-5555-4555-8555-555555555555',
  zone: '66666666-6666-4666-8666-666666666666'
}
const sessions = new Map()
const usage = {id: quickExclusionIds.usage, code: '2', kind: 'USAGE', label: 'Irrigation', children: []}
const point = {id: quickExclusionIds.point, name: 'Point partagé synthétique', flowType: 'PRELEVEMENT', right: {permissions: []}}
const declarant = {id: quickExclusionIds.user, socialReason: 'Préleveur synthétique', declarantRole: 'PRELEVEUR'}

export function isQuickExclusionFixture(authorization = '') {
  return /^Bearer browser-test-quick-exclusion-/.test(authorization)
}

export async function handleQuickExclusionFixtureRequest(request, send) {
  const authorization = request.headers.authorization
  if (!isQuickExclusionFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, data) => { send(status, data); return true }
  const readOnly = authorization.includes('-readonly-')
  const collector = authorization.includes('-collector-')
  const role = readOnly ? 'DECLARANT' : authorization.includes('-instructor-') ? 'INSTRUCTOR' : 'ADMIN'
  const permissions = readOnly ? [] : ['exploitation.create', 'exploitation.update', 'exploitation.list', 'zone.detail.read']
  const state = sessions.get(authorization) ?? {requests: [], excludeFromQuickDeclaration: authorization.includes('-excluded-') ? true : undefined}
  sessions.set(authorization, state)
  const exploitation = () => ({
    id: quickExclusionIds.first, countingCode: '001', excludeFromQuickDeclaration: state.excludeFromQuickDeclaration,
    status: 'EN_ACTIVITE', startDate: '2026-01-01', usageId: usage.id, usage, secondaryUsages: [], connectors: [], collecteurs: [],
    declarantUserId: declarant.id, declarant, pointPrelevementId: point.id, pointPrelevement: point,
    right: {canEdit: !readOnly, permissions: []}
  })
  const zone = {id: quickExclusionIds.zone, name: 'Zone synthétique', type: 'SAGE', code: 'SYNTH', permissions, isAdmin: role === 'ADMIN'}
  const readBody = async () => {
    const parts = []
    for await (const part of request) parts.push(part)
    return JSON.parse(Buffer.concat(parts).toString())
  }
  if (pathname === '/info' || pathname === '/api/info') return respond(200, {role, permissions, user: {id: declarant.id, email: 'quick-exclusion@example.test'}, expiresAt: new Date(Date.now() + 3_600_000).toISOString()})
  if (pathname === '/api/__quick-exclusion-requests') return respond(200, state.requests)
  if (pathname === '/api/__quick-exclusion-stale' && request.method === 'POST') {
    state.excludeFromQuickDeclaration = true
    return respond(200, {ok: true})
  }
  if (pathname === '/api/users/me/zones') return respond(200, [])
  if (pathname === '/api/referentiels/usages-eau') return respond(200, {items: [usage]})
  if (pathname === '/api/points-prelevement' || pathname === `/api/zones/${zone.id}/points-prelevement/options`) return respond(200, [point])
  if (pathname === '/api/declarants' || pathname === `/api/zones/${zone.id}/exploitations/declarants-options`) return respond(200, [declarant])
  if (pathname === `/api/zones/${zone.id}`) return respond(200, zone)
  if (pathname === '/api/campaigns/summary') return respond(200, {success: true, data: {items: []}})
  if (pathname === '/api/declarations/allowed-types') return respond(200, {success: true, data: authorization.includes('-file-') ? [{code: 'template-file', name: 'Modèle de déclaration'}] : [], meta: {declarantRole: collector ? 'COLLECTEUR' : 'PRELEVEUR', preleveurs: collector ? [{id: quickExclusionIds.user, firstName: 'Préleveur', lastName: 'Disponible', quickDeclarationEnabled: true, canCreateQuickDeclaration: true}, {id: quickExclusionIds.second, firstName: 'Préleveur', lastName: 'Exclu', quickDeclarationEnabled: true, canCreateQuickDeclaration: false}] : [], quickDeclarationEnabled: true, canCreateQuickDeclaration: !authorization.includes('-all-excluded-') && !authorization.includes('-file-')}})
  if (pathname === '/api/declarations/quick/context') {
    if (collector) await new Promise(resolve => setTimeout(resolve, 800))
    const ids = authorization.includes('-all-excluded-') ? [] : [quickExclusionIds.first, quickExclusionIds.second].filter(id => id !== quickExclusionIds.first || !state.excludeFromQuickDeclaration)
    return respond(200, {success: true, data: {points: ids.map(id => ({
      id: point.id, pointPrelevementId: point.id, exploitationId: id,
      name: point.name, countingCode: id === quickExclusionIds.first ? '001' : '002', usage, flowType: 'PRELEVEMENT',
      lastReading: {value: 100, date: '2026-09-01', unit: 'm³'}
    })), usageOptions: [usage]}})
  }
  if (pathname === '/api/declarations/quick' || pathname === '/api/declarations/quick/conflicts') {
    const body = await readBody()
    state.requests.push({path: pathname, method: request.method, body})
    if (state.excludeFromQuickDeclaration && body.entries.some(entry => entry.exploitationId === quickExclusionIds.first)) {
      return respond(400, {message: 'Cette exploitation est exclue de la saisie rapide.'})
    }
    return pathname.endsWith('/conflicts')
      ? respond(200, {success: true, data: {conflicts: []}})
      : respond(409, {message: 'Soumission synthétique sans donnée métier.'})
  }
  const globalDetail = `/api/exploitations/${quickExclusionIds.first}`
  const zoneList = `/api/zones/${zone.id}/exploitations`
  const zoneDetail = `${zoneList}/${quickExclusionIds.first}`
  if ([globalDetail, zoneDetail, '/api/exploitations', zoneList].includes(pathname)) {
    if (['POST', 'PUT'].includes(request.method)) {
      if (readOnly) return respond(403, {message: 'Lecture seule'})
      const body = await readBody()
      state.requests.push({path: pathname, method: request.method, body})
      state.excludeFromQuickDeclaration = body.excludeFromQuickDeclaration
      return respond(request.method === 'POST' ? 201 : 200, exploitation())
    }
    return respond(200, [zoneList, '/api/exploitations'].includes(pathname) ? [exploitation()] : exploitation())
  }
  if (pathname.endsWith('/meter-allocations')) return respond(200, {meterAllocations: []})
  if (pathname === `/api/points-prelevement/${point.id}`) return respond(200, point)
  if (pathname === `/api/points-prelevement/${point.id}/exploitations`) return respond(200, [exploitation()])
  if (pathname.endsWith('/documents') || pathname.endsWith('/regles')) return respond(200, [])
  if (pathname.startsWith('/api/audit-history/')) return respond(200, {data: [], meta: {total: 0}})
  if (pathname === '/api/aggregated-series/options') return respond(200, {parameters: []})
  return false
}
