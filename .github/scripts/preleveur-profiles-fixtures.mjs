import {randomUUID} from 'node:crypto'

// Isolated authentication fixture: no real account, mail, database or network.
const sessions = new Map()
const preleveurs = [
  {id: 'eeeeeeee-1111-4111-8111-111111111111', firstName: 'Alice', lastName: 'Dupont', socialReason: 'Ferme du Dropt', siret: '12345678900012', city: 'Eymet'},
  {id: 'eeeeeeee-2222-4222-8222-222222222222', firstName: 'Camille', lastName: 'Martin', socialReason: null, siret: null, city: 'Duras'}
]
const expiresAt = () => new Date(Date.now() + 3_600_000).toISOString()

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString())
}

export async function handlePreleveurProfilesFixture(request, send) {
  const pathname = new URL(request.url, 'http://fixture').pathname.replace(/^\/api\//, '/')
  if (pathname === '/auth/password' && request.method === 'POST') {
    const body = await readBody(request)
    if (!/^profiles-[\w-]+@example\.test$/.test(body.email) || body.password !== 'synthetic-test-password') {
      send(401, {message: 'Identifiants invalides'})
      return true
    }
    const token = `browser-test-profiles-${randomUUID()}`
    const single = body.email.startsWith('profiles-single-')
    sessions.set(token, {email: body.email, current: single ? preleveurs[0].id : null, family: {requests: [], single, refused: body.email.startsWith('profiles-refused-')}, revoked: false})
    send(200, {success: true, token, expiresAt: expiresAt()})
    return true
  }

  const token = request.headers.authorization?.replace(/^Bearer /, '')
  if (!token?.startsWith('browser-test-profiles-')) return false
  const state = sessions.get(token)
  if (!state || state.revoked) {
    send(401, {message: 'Session révoquée'})
    return true
  }
  const selectionRequired = !state.current
  const profile = preleveurs.find(item => item.id === state.current) || preleveurs[0]
  if (pathname === '/__preleveur-profiles-requests') {
    send(200, state.family.requests)
  } else if (pathname === '/info') {
    send(200, {
      role: 'DECLARANT',
      user: {...profile, email: state.email, declarantRole: 'PRELEVEUR', declarantType: profile.socialReason ? 'PERSONNE_MORALE' : 'PERSONNE_PHYSIQUE'},
      preleveurProfiles: {enabled: true, selectionRequired, canSwitch: !state.family.single, canManageAccount: state.current === preleveurs[0].id}, expiresAt: expiresAt()
    })
  } else if (pathname === '/auth/preleveurs' && request.method === 'GET') {
    send(200, {preleveurs: state.family.single ? [preleveurs[0]] : preleveurs, currentPreleveurId: state.current, selectionRequired})
  } else if (pathname === '/auth/preleveurs/select' && request.method === 'POST') {
    const body = await readBody(request)
    state.family.requests.push({pathname, body})
    if (state.family.refused || !preleveurs.some(item => item.id === body.preleveurId)) {
      send(403, {message: 'Ce préleveur n’est plus accessible.'})
    } else {
      state.revoked = true
      const nextToken = `browser-test-profiles-${randomUUID()}`
      sessions.set(nextToken, {...state, current: body.preleveurId, revoked: false})
      send(200, {success: true, ...(!state.email.startsWith('profiles-no-token-') ? {token: nextToken} : {}), expiresAt: expiresAt()})
    }
  } else if (pathname === '/auth/logout') {
    state.revoked = true
    send(200, {success: true})
  } else if (pathname === '/users/me/activity') {
    send(200, {month: '2026-11'})
  } else {
    state.family.requests.push({pathname, currentPreleveurId: state.current})
    if (selectionRequired) {
      send(409, {code: 'PRELEVEUR_SELECTION_REQUIRED', message: 'Choisissez un préleveur.'})
    } else if (pathname === '/dashboard/territory') {
      send(200, {
        scope: 'DECLARANT', zones: [], selectedZoneCodes: [], unknownZoneCodes: [],
        metrics: {totalPoints: 0, usageDistribution: []},
        registeredPrelevements: {selectedPeriodType: 'month', selectedPeriod: '2026-10', periodOptions: [], byUsage: []},
        volumesByUsage: {selectedYear: 2026, yearOptions: [2026], selectedWaterBodyTypes: [], charts: {}}
      })
    } else if (pathname === '/dashboard/map') {
      send(200, {points: [], capabilities: {}})
    } else if (pathname.startsWith('/dashboard/water-resources/')) {
      send(200, {stations: [], warnings: []})
    } else if (pathname === '/campaigns/summary') {
      send(200, {success: true, data: {hasCampaigns: false, items: []}})
    } else if (pathname === '/declarations/allowed-types') {
      send(200, {data: [], meta: {canCreateDeclaration: false, canCreateQuickDeclaration: false}})
    } else if (pathname === '/aggregated-series/options') {
      send(200, {parameters: []})
    } else {
      send(404, {message: 'Fixture absente'})
    }
  }
  return true
}
