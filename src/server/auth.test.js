import test from 'ava'

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
  t.false(Object.hasOwn(token, 'password'))
  t.false(Object.hasOwn(session.user, 'password'))
})
