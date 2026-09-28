// Synthetic SAGE configuration, isolated per session; no real API or database.
export const zoneResourceIds = {
  sage: '45454545-4545-4545-8545-454545454541',
  department: '45454545-4545-4545-8545-454545454542'
}
const sessions = new Map()

export function isZoneResourceFixture(authorization = '') {
  return /^Bearer browser-test-zone-resource-(?:edit|readonly|failure|denied)-/.test(authorization)
}

export async function handleZoneResourceFixtureRequest(request, send) {
  const authorization = request.headers.authorization
  if (!isZoneResourceFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const canRead = !authorization.includes('-denied-')
  const canEdit = canRead && !authorization.includes('-readonly-')
  const permissions = canRead ? ['zone.detail.read', 'zone.resource.list'] : []
  const state = sessions.get(authorization) ?? {managedResourceType: 'MIXTE', requests: [], hasFailed: false}
  sessions.set(authorization, state)
  const zones = Object.entries(zoneResourceIds).map(([kind, id]) => ({
    id, name: kind === 'sage' ? 'SAGE synthétique' : 'Département synthétique',
    code: kind === 'sage' ? 'SAGE-SYNTHETIQUE' : '99', type: kind === 'sage' ? 'SAGE' : 'DEPARTEMENT',
    permissions, isAdmin: false, managedResourceType: kind === 'sage' ? state.managedResourceType : null
  }))

  if (pathname === '/info' || pathname === '/api/info') {
    send(200, {
      role: 'INSTRUCTOR', permissions,
      user: {id: zoneResourceIds.sage, email: 'sage@example.test'},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
  } else if (pathname === '/api/__zone-resource-requests') {
    send(200, state.requests)
  } else if (pathname === '/api/zones' || pathname === '/api/users/me/zones') {
    send(200, zones)
  } else if (pathname === `/api/zones/${zoneResourceIds.sage}/resource-settings`) {
    if (!canRead || (request.method === 'PATCH' && !canEdit)) {
      send(403, {message: 'Droits insuffisants'})
      return true
    }
    if (request.method === 'PATCH') {
      const parts = []
      for await (const part of request) parts.push(part)
      const body = JSON.parse(Buffer.concat(parts).toString())
      state.requests.push({method: request.method, body})
      if (authorization.includes('-failure-') && !state.hasFailed) {
        state.hasFailed = true
        send(503, {message: 'Enregistrement temporairement indisponible.'})
        return true
      }
      if (Object.keys(body).length !== 1 || !['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION', 'MIXTE'].includes(body.managedResourceType)) {
        send(400, {message: 'Type de ressource invalide'})
        return true
      }
      state.managedResourceType = body.managedResourceType
    }
    send(200, {data: {managedResourceType: state.managedResourceType}, canEdit})
  } else if (pathname === `/api/zones/${zoneResourceIds.department}/resource-settings`) {
    send(400, {message: 'Cette zone n’est pas un SAGE'})
  } else if (zones.some(zone => pathname === `/api/zones/${zone.id}`)) {
    if (!canRead) send(403, {message: 'Droits insuffisants'})
    else send(200, zones.find(zone => pathname === `/api/zones/${zone.id}`))
  } else {
    return false
  }
  return true
}
