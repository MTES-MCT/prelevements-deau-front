// Isolated sessions for login and transient-network regression tests.
const sessions = new Map()
const userId = 'dddddddd-1111-4111-8111-111111111111'
const profile = {id: userId, socialReason: 'Établissement de test', siret: '12345678900012'}

export async function handleLoginSessionFixture(request, response, send) {
  const pathname = new URL(request.url, 'http://fixture').pathname.replace(/^\/api\//, '/')
  const token = request.headers.authorization?.replace(/^Bearer /, '')
  if (!token?.startsWith('browser-test-login-')) return false

  if (pathname === '/__login-session' && request.method === 'PUT') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const payload = JSON.parse(Buffer.concat(chunks).toString())
    if (!['valid', 'unavailable', 'network', 'revoked', 'forbidden'].includes(payload.mode)) {
      send(400, {message: 'Invalid fixture mode'})
      return true
    }
    const previous = sessions.get(token)
    sessions.set(token, {
      mode: payload.mode,
      selectionRequired: payload.selectionRequired === true,
      expiresAt: payload.expiresAt || previous?.expiresAt || new Date(Date.now() + 3_600_000).toISOString(),
      requests: previous?.requests || []
    })
    send(200, {ok: true})
    return true
  }

  const state = sessions.get(token)
  if (!state) {
    send(401, {message: 'Unknown synthetic session'})
    return true
  }
  if (pathname === '/__login-session') {
    send(200, {mode: state.mode, requests: state.requests})
    return true
  }
  state.requests.push({pathname, method: request.method, mode: state.mode})

  if (pathname === '/info') {
    if (state.mode === 'network') {
      response.destroy()
      return true
    }
    if (state.mode !== 'valid') {
      const status = {unavailable: 503, revoked: 401, forbidden: 403}[state.mode]
      send(status, {message: 'Synthetic session check failure'})
      return true
    }
    send(200, {
      role: state.selectionRequired ? 'DECLARANT' : 'INSTRUCTOR', permissions: [],
      user: {id: userId, email: 'login@example.test', firstName: 'Camille', lastName: 'Martin', ...(state.selectionRequired ? {declarantRole: 'PRELEVEUR'} : {})},
      preleveurProfiles: state.selectionRequired ? {enabled: true, selectionRequired: true, canSwitch: true} : null,
      expiresAt: state.expiresAt
    })
  } else if (pathname === '/auth/preleveurs') {
    send(200, {preleveurs: [profile], currentPreleveurId: null, selectionRequired: state.selectionRequired})
  } else if (pathname === '/users/me/zones') {
    send(200, [])
  } else if (pathname === '/users/me/activity') {
    send(200, {month: '2026-11'})
  } else if (pathname === '/auth/logout') {
    state.mode = 'revoked'
    send(200, {success: true})
  } else {
    send(404, {message: 'Fixture absente'})
  }
  return true
}
