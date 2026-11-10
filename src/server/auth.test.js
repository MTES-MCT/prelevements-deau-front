import test from 'ava'
import {encode, decode} from 'next-auth/jwt'

import {authOptions, getLoginSessionState} from './auth.js'

test('n’expose pas les habilitations détaillées dans le JWT NextAuth', async t => {
  const token = await authOptions.callbacks.jwt({
    token: {
      zoneAssignments: [{zoneId: 'zone-1', permissions: ['zone.detail.read']}]
    },
    user: {
      token: 'api-token',
      role: 'INSTRUCTOR',
      userInfo: {
        id: 'user-1',
        email: 'agent@example.test',
        emailAliases: Array.from({length: 100}, (_value, index) => `agent+${index}@example.test`),
        addressLine1: 'Champ inutile dans la session'
      },
      permissions: ['zone.detail.read'],
      zoneAssignments: [{zoneId: 'zone-1', permissions: ['zone.detail.read']}]
    }
  })

  t.false(Object.hasOwn(token, 'zoneAssignments'))
  t.deepEqual(token.userInfo, {
    id: 'user-1',
    email: 'agent@example.test',
    firstName: undefined,
    lastName: undefined,
    structure: undefined,
    declarantType: undefined,
    declarantRole: undefined,
    socialReason: undefined,
    siret: undefined
  })

  const session = await authOptions.callbacks.session({
    session: {user: {}},
    token
  })

  t.false(Object.hasOwn(session.user, 'zoneAssignments'))
  t.deepEqual(session.user.permissions, ['zone.detail.read'])
})

test('conserve uniquement l’échéance API dans la session, sans credential', async t => {
  const expiresAt = '2026-08-22T01:00:00.000Z'
  const token = await authOptions.callbacks.jwt({
    token: {},
    user: {
      token: 'api-token',
      expiresAt,
      role: 'DECLARANT',
      userInfo: {id: 'user-1'},
      password: 'ne-doit-jamais-apparaitre'
    }
  })

  const session = await authOptions.callbacks.session({
    session: {user: {}},
    token
  })

  t.is(session.expires, expiresAt)
  t.is(session.user.apiExpiresAt, expiresAt)
  t.false(Object.hasOwn(token, 'password'))
  t.false(Object.hasOwn(session.user, 'password'))
})

test('le cookie reste compact même avec de nombreux préleveurs accessibles', async t => {
  const token = await authOptions.callbacks.jwt({
    token: {},
    user: {
      token: 'api-token', role: 'DECLARANT', userInfo: {id: 'user-1', declarantRole: 'PRELEVEUR'},
      preleveurProfiles: {enabled: true, selectionRequired: true, preleveurs: Array.from({length: 500}, (_, id) => ({id, socialReason: 'Fiche privée'}))}
    }
  })
  const secret = 'unit-test-only-secret'
  const cookie = await encode({token, secret})
  const decoded = await decode({token: cookie, secret})
  t.true(cookie.length < 2000)
  t.deepEqual(decoded.preleveurProfiles, {enabled: true, selectionRequired: true})
  t.false(JSON.stringify(decoded).includes('Fiche privée'))
  const session = await authOptions.callbacks.session({session: {user: {}}, token})
  t.deepEqual(session.user.preleveurProfiles, {enabled: true, selectionRequired: true})
})

test.serial('la rotation vérifie le nouveau jeton auprès de l’API et remplace identité et indicateurs', async t => {
  const originalFetch = globalThis.fetch
  t.teardown(() => { globalThis.fetch = originalFetch })
  const requests = []
  globalThis.fetch = async (_url, options) => {
    requests.push(options.headers.Authorization)
    return Response.json({
      role: 'DECLARANT', user: {id: 'new-profile', socialReason: 'Nouvel établissement', siret: '12345678900012', declarantRole: 'PRELEVEUR'},
      preleveurProfiles: {enabled: true, selectionRequired: false}, expiresAt: '2026-12-01T00:00:00Z'
    })
  }
  const token = await authOptions.callbacks.jwt({
    token: {token: 'old-token', userInfo: {id: 'old-profile'}, preleveurProfiles: {enabled: true, selectionRequired: true}},
    trigger: 'update',
    session: {token: 'new-token', userInfo: {id: 'forged-profile', siret: 'forged-siret'}, preleveurProfiles: {enabled: true, selectionRequired: true}}
  })
  t.deepEqual(requests, ['Bearer new-token'])
  t.is(token.token, 'new-token')
  t.is(token.userInfo.id, 'new-profile')
  t.is(token.userInfo.socialReason, 'Nouvel établissement')
  t.is(token.userInfo.siret, '12345678900012')
  const session = await authOptions.callbacks.session({session: {user: {}}, token})
  t.is(session.user.socialReason, 'Nouvel établissement')
  t.is(session.user.siret, '12345678900012')
  t.deepEqual(token.preleveurProfiles, {enabled: true, selectionRequired: false})
  t.is(token.apiExpiresAt, '2026-12-01T00:00:00Z')
})

test.serial('un rafraîchissement sans option multi-préleveur supprime les anciens indicateurs', async t => {
  const originalFetch = globalThis.fetch
  t.teardown(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async () => Response.json({role: 'ADMIN', user: {id: 'admin'}})
  const token = await authOptions.callbacks.jwt({
    token: {token: 'api-token', userInfo: {siret: '12345678900012'}, preleveurProfiles: {enabled: true, selectionRequired: true}},
    trigger: 'update', session: {preleveurProfiles: {enabled: true, selectionRequired: false}}
  })
  t.is(token.preleveurProfiles, null)
  t.is(token.role, 'ADMIN')
  t.is(token.userInfo.siret, undefined)
})

function existingSessionToken(overrides = {}) {
  return {
    token: 'existing-api-token',
    apiExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    role: 'DECLARANT',
    userInfo: {id: 'collector-1', declarantRole: 'COLLECTEUR'},
    permissions: ['declaration.read'],
    impersonation: null,
    preleveurProfiles: null,
    infoRefreshedAt: Date.now() - 10 * 60 * 1000,
    ...overrides
  }
}

function replaceFetch(t, implementation) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = implementation
  t.teardown(() => { globalThis.fetch = originalFetch })
}

for (const [name, fetchInfo] of [
  ['une erreur réseau', async () => { throw new TypeError('fetch failed') }],
  ['un délai de connexion dépassé', async () => { throw new DOMException('Timed out', 'TimeoutError') }],
  ['une indisponibilité API', async () => new Response('Unavailable', {status: 503})],
  ['une limitation temporaire', async () => new Response('Too many requests', {status: 429})],
  ['un JSON invalide', async () => new Response('Invalid JSON')],
  ['un contenu incomplet', async () => Response.json({})]
]) {
  test.serial(`conserve la session connue et ses droits lors de ${name}`, async t => {
    replaceFetch(t, fetchInfo)
    const token = existingSessionToken()
    const original = structuredClone(token)
    const result = await authOptions.callbacks.jwt({token})
    t.is(result.token, original.token)
    t.is(result.apiExpiresAt, original.apiExpiresAt)
    t.is(result.role, original.role)
    t.is(result.userInfo.id, original.userInfo.id)
    t.deepEqual(result.permissions, original.permissions)
    t.is(result.infoRefreshedAt, original.infoRefreshedAt)
    t.true(result.infoRetryAt > Date.now())
  })
}

for (const status of [401, 403]) {
  test.serial(`invalide toujours une session refusée par l’API (${status})`, async t => {
    replaceFetch(t, async () => new Response('Unauthorized', {status}))
    await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken()}), {message: 'CredentialsSignin'})
  })
}

test.serial('refuse une session expirée même avant le prochain contrôle et pendant le délai de réessai', async t => {
  let requests = 0
  replaceFetch(t, async () => { requests++; throw new TypeError('fetch failed') })
  const token = existingSessionToken({
    apiExpiresAt: new Date(Date.now() - 1).toISOString(),
    infoRefreshedAt: Date.now(),
    infoRetryAt: Date.now() + 30_000
  })
  await t.throwsAsync(authOptions.callbacks.jwt({token}), {message: 'CredentialsSignin'})
  t.is(requests, 0)
})

test.serial('ne prolonge pas une session qui expire pendant le contrôle réseau', async t => {
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  t.teardown(() => { Date.now = originalNow })
  const token = existingSessionToken({apiExpiresAt: new Date(now + 1000).toISOString()})
  replaceFetch(t, async () => { now += 2000; throw new TypeError('fetch failed') })
  await t.throwsAsync(authOptions.callbacks.jwt({token}))
  t.false(Object.hasOwn(token, 'infoRetryAt'))
})

test.serial('conserve un ancien cookie sans échéance API uniquement dans sa validité JWT', async t => {
  replaceFetch(t, async () => { throw new TypeError('fetch failed') })
  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = await authOptions.callbacks.jwt({token: existingSessionToken({apiExpiresAt: null, exp})})
  t.is(token.exp, exp)
  t.is(token.apiExpiresAt, new Date(exp * 1000).toISOString())
  await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken({apiExpiresAt: null, exp: Math.floor(Date.now() / 1000) - 1})}), {message: 'CredentialsSignin'})
})

test.serial('le renouvellement JWT NextAuth ne prolonge pas le secours d’un ancien cookie', async t => {
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  t.teardown(() => { Date.now = originalNow })
  replaceFetch(t, async () => { throw new TypeError('fetch failed') })
  const originalExp = Math.floor(now / 1000) + 3600
  const originalDeadline = new Date(originalExp * 1000).toISOString()
  const secret = 'unit-test-only-secret'

  const firstFallback = await authOptions.callbacks.jwt({
    token: existingSessionToken({apiExpiresAt: null, exp: originalExp})
  })
  const cookie = await encode({token: firstFallback, secret, maxAge: 30 * 24 * 60 * 60})
  const renewedToken = await decode({token: cookie, secret})
  t.true(renewedToken.exp > originalExp)
  t.is(renewedToken.apiExpiresAt, originalDeadline)

  now += 60_000
  const secondFallback = await authOptions.callbacks.jwt({token: renewedToken})
  t.is(secondFallback.apiExpiresAt, originalDeadline)

  now = originalExp * 1000 + 1
  await t.throwsAsync(authOptions.callbacks.jwt({token: secondFallback}), {message: 'CredentialsSignin'})
})

test.serial('n’utilise pas une session sans identité ni limite de validité comme secours', async t => {
  replaceFetch(t, async () => { throw new TypeError('fetch failed') })
  await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken({apiExpiresAt: null})}))
  await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken({userInfo: null})}))
  await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken({apiExpiresAt: 'not-a-date'})}), {message: 'CredentialsSignin'})
})

test.serial('n’installe jamais un jeton de remplacement non vérifié lors d’une panne', async t => {
  const requests = []
  replaceFetch(t, async (_url, options) => {
    requests.push(options.headers.Authorization)
    throw new TypeError('fetch failed')
  })
  const token = existingSessionToken()
  await t.throwsAsync(authOptions.callbacks.jwt({
    token,
    trigger: 'update',
    session: {token: 'unverified-replacement', userInfo: {id: 'forged'}, permissions: ['admin']}
  }))
  t.deepEqual(requests, ['Bearer unverified-replacement'])
  t.is(token.token, 'existing-api-token')
  t.is(token.userInfo.id, 'collector-1')
  t.deepEqual(token.permissions, ['declaration.read'])
})

test.serial('ignore un jeton client en dehors d’une demande explicite de mise à jour', async t => {
  const requests = []
  replaceFetch(t, async (_url, options) => {
    requests.push(options.headers.Authorization)
    return Response.json({role: 'DECLARANT', user: {id: 'collector-1'}})
  })
  const result = await authOptions.callbacks.jwt({token: existingSessionToken(), session: {token: 'unexpected-token'}})
  t.deepEqual(requests, ['Bearer existing-api-token'])
  t.is(result.token, 'existing-api-token')
})

test.serial('réessaie après une panne et remplace les informations uniquement avec la réponse API', async t => {
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  t.teardown(() => { Date.now = originalNow })
  let requests = 0
  replaceFetch(t, async (_url, options) => {
    t.true(options.signal instanceof AbortSignal)
    requests++
    if (requests === 1) throw new TypeError('fetch failed')
    return Response.json({
      role: 'DECLARANT', user: {id: 'collector-1', socialReason: 'Identité actualisée'},
      permissions: ['declaration.read', 'point.read'], expiresAt: new Date(now + 600_000).toISOString()
    })
  })
  let token = await authOptions.callbacks.jwt({token: existingSessionToken()})
  token = await authOptions.callbacks.jwt({token})
  t.is(requests, 1)
  now += 30_000
  token = await authOptions.callbacks.jwt({token})
  t.is(requests, 2)
  t.is(token.userInfo.socialReason, 'Identité actualisée')
  t.deepEqual(token.permissions, ['declaration.read', 'point.read'])
  t.is(token.infoRefreshedAt, now)
  t.false(Object.hasOwn(token, 'infoRetryAt'))
})

test.serial('une mise à jour explicite contrôle les droits malgré le délai de réessai', async t => {
  let requests = 0
  replaceFetch(t, async () => {
    requests++
    return Response.json({role: 'DECLARANT', user: {id: 'collector-1'}, permissions: []})
  })
  const token = await authOptions.callbacks.jwt({
    token: existingSessionToken({infoRetryAt: Date.now() + 30_000}),
    trigger: 'update', session: {permissions: ['admin']}
  })
  t.is(requests, 1)
  t.deepEqual(token.permissions, [])
  t.false(Object.hasOwn(token, 'infoRetryAt'))
})

test.serial('refuse une échéance expirée ou invalide dans une réponse API réussie', async t => {
  for (const expiresAt of [new Date(Date.now() - 1).toISOString(), 'not-a-date']) {
    replaceFetch(t, async () => Response.json({role: 'DECLARANT', user: {id: 'collector-1'}, expiresAt}))
    await t.throwsAsync(authOptions.callbacks.jwt({token: existingSessionToken()}), {message: 'CredentialsSignin'})
  }
})

test.serial('le contrôle de login vérifie les droits frais et les profils dans l’API', async t => {
  const requests = []
  replaceFetch(t, async (_url, options) => {
    requests.push(options.headers.Authorization)
    return Response.json({
      role: 'DECLARANT', user: {id: 'collector-1'},
      preleveurProfiles: {enabled: true, selectionRequired: true, preleveurs: [{id: 'private-profile'}]}
    })
  })
  const result = await getLoginSessionState({user: {
    token: 'existing-api-token', preleveurProfiles: {enabled: true, selectionRequired: false}
  }})
  t.deepEqual(requests, ['Bearer existing-api-token'])
  t.deepEqual(result, {status: 'authenticated', preleveurProfiles: {enabled: true, selectionRequired: true}})
})

test.serial('le contrôle de login distingue une panne temporaire d’une session absente ou refusée', async t => {
  let requests = 0
  replaceFetch(t, async () => { requests++; throw new TypeError('fetch failed') })
  t.deepEqual(await getLoginSessionState(null), {status: 'unauthenticated'})
  t.deepEqual(await getLoginSessionState({user: {}}), {status: 'unauthenticated'})
  t.is(requests, 0)
  t.deepEqual(await getLoginSessionState({user: {token: 'api-token'}}), {status: 'unavailable'})
  t.is(requests, 1)
})

for (const status of [401, 403, 429, 503]) {
  test.serial(`le contrôle de login classe la réponse API ${status}`, async t => {
    replaceFetch(t, async () => new Response('', {status}))
    t.deepEqual(await getLoginSessionState({user: {token: 'api-token'}}), {
      status: status === 401 || status === 403 ? 'unauthenticated' : 'unavailable'
    })
  })
}

test.serial('le contrôle de login ne redirige pas sur une réponse JSON incomplète', async t => {
  replaceFetch(t, async () => Response.json({}))
  t.deepEqual(await getLoginSessionState({user: {token: 'api-token'}}), {status: 'unavailable'})
})

test.serial('le contrôle de login refuse une session expirée avant tout appel', async t => {
  let requests = 0
  replaceFetch(t, async () => { requests++; throw new TypeError('fetch failed') })
  for (const apiExpiresAt of [new Date(Date.now() - 1).toISOString(), 'not-a-date']) {
    t.deepEqual(await getLoginSessionState({user: {token: 'api-token', apiExpiresAt}}), {status: 'unauthenticated'})
  }
  t.is(requests, 0)
})
