export const agentId = '50505050-5050-4050-8050-505050505050'
export const zones = [
  {id: '50505050-5050-4050-8050-505050505051', code: 'A', name: 'SAGE Alpha', type: 'SAGE'},
  {id: '50505050-5050-4050-8050-505050505052', code: 'B', name: 'PTGE Bravo', type: 'PTGE'}
]
export const managerPermissions = ['zone.detail.read', 'zone.agent.list', 'zone.agent.create', 'zone.agent.update', 'zone.agent.remove']
const sessions = new Map()

export async function handleAgentDashboardDefaultFixture(request, send) {
  const authorization = request.headers.authorization ?? ''
  const role = /^Bearer browser-test-agent-default-(ADMIN|INSTRUCTOR)-/.exec(authorization)?.[1]
  if (!role) return false
  const impersonating = authorization.includes('-impersonation-')
  const {pathname} = new URL(request.url, 'http://localhost')
  const agent = {id: agentId, firstName: 'Camille', lastName: 'Exemple', accountStatus: 'ACTIVE', accessStatus: 'ACTIVE'}
  const canManage = zone => role === 'ADMIN' || zone === zones[0]
  const habilitations = zones.map(zone => ({
    id: 'mandat-' + zone.code, zoneId: zone.id, zone, status: 'ACTIVE', startDate: '2020-01-01',
    endDate: null, permissions: ['zone.dashboard.read'],
    isDashboardDefault: (impersonating ? zones[0].id : sessions.get(authorization)) === zone.id
  }))
  const zone = zones.find(item => pathname.startsWith('/api/zones/' + item.id))
  const zonePath = zone && '/api/zones/' + zone.id
  const instructorPath = zonePath + '/instructeurs/' + agentId
  if (pathname === '/info' || pathname === '/api/info') {
    send(200, {role, permissions: managerPermissions, impersonation: impersonating ? {active: true} : null,
      user: {id: 'acteur-test', email: 'acteur@example.test'}, expiresAt: new Date(Date.now() + 3_600_000).toISOString()})
  } else if (pathname === '/api/admin/agents/' + agentId) {
    if (role === 'ADMIN') send(200, {...agent, habilitations})
    else send(403, {message: 'Accès réservé à l’équipe PE.'})
  } else if (pathname === '/api/zone-agent-permissions') {
    send(200, {groups: [{code: 'dashboard', label: 'Tableau de bord', permissions: [{code: 'zone.dashboard.read', label: 'Consulter le tableau de bord'}]}]})
  } else if (zone && pathname === zonePath && canManage(zone)) {
    send(200, {...zone, permissions: managerPermissions})
  } else if (zone && pathname === instructorPath && canManage(zone)) {
    send(200, {...agent, habilitations: habilitations.map(item => ({...item, isCurrentZone: item.zoneId === zone.id})),
      otherHabilitations: habilitations.filter(item => item.zoneId !== zone.id)})
  } else if (zone && pathname === instructorPath + '/dashboard-default' && request.method === 'PUT' && canManage(zone)) {
    const parts = []
    for await (const part of request) parts.push(part)
    const {isDashboardDefault} = JSON.parse(Buffer.concat(parts).toString())
    if (impersonating) send(403, {message: 'Action indisponible en impersonation.'})
    else if (typeof isDashboardDefault !== 'boolean') send(400, {message: 'Valeur attendue : un booléen.'})
    else {
      if (isDashboardDefault) sessions.set(authorization, zone.id)
      else if (sessions.get(authorization) === zone.id) sessions.delete(authorization)
      send(200, {isDashboardDefault})
    }
  } else if (pathname === '/api/zones' || pathname === '/api/users/me/zones') {
    send(200, zones.filter(canManage).map(item => ({...item, permissions: managerPermissions})))
  } else if (pathname === '/api/campaigns/summary') {
    send(200, {success: true, data: {hasCampaigns: false, items: []}})
  } else if (pathname === '/api/users/me/activity' && request.method === 'POST') {
    send(200, {success: true})
  } else {
    send(404, {message: 'Page introuvable'})
  }
  return true
}
