import test from 'ava'
import {encode, decode} from 'next-auth/jwt'

import {authOptions} from './auth.js'

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
    socialReason: undefined
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
      role: 'DECLARANT', user: {id: 'new-profile', socialReason: 'Nouveau préleveur', declarantRole: 'PRELEVEUR'},
      preleveurProfiles: {enabled: true, selectionRequired: false}, expiresAt: '2026-12-01T00:00:00Z'
    })
  }
  const token = await authOptions.callbacks.jwt({
    token: {token: 'old-token', userInfo: {id: 'old-profile'}, preleveurProfiles: {enabled: true, selectionRequired: true}},
    trigger: 'update',
    session: {token: 'new-token', userInfo: {id: 'forged-profile'}, preleveurProfiles: {enabled: true, selectionRequired: true}}
  })
  t.deepEqual(requests, ['Bearer new-token'])
  t.is(token.token, 'new-token')
  t.is(token.userInfo.id, 'new-profile')
  t.deepEqual(token.preleveurProfiles, {enabled: true, selectionRequired: false})
  t.is(token.apiExpiresAt, '2026-12-01T00:00:00Z')
})

test.serial('un rafraîchissement sans option multi-préleveur supprime les anciens indicateurs', async t => {
  const originalFetch = globalThis.fetch
  t.teardown(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async () => Response.json({role: 'ADMIN', user: {id: 'admin'}})
  const token = await authOptions.callbacks.jwt({
    token: {token: 'api-token', preleveurProfiles: {enabled: true, selectionRequired: true}},
    trigger: 'update', session: {preleveurProfiles: {enabled: true, selectionRequired: false}}
  })
  t.is(token.preleveurProfiles, null)
  t.is(token.role, 'ADMIN')
})
