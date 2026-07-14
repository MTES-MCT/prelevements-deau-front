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
      userInfo: {id: 'user-1'},
      permissions: ['zone.detail.read'],
      zoneAssignments: [{zoneId: 'zone-1', permissions: ['zone.detail.read']}]
    }
  })

  t.false(Object.hasOwn(token, 'zoneAssignments'))

  const session = await authOptions.callbacks.session({
    session: {user: {}},
    token
  })

  t.false(Object.hasOwn(session.user, 'zoneAssignments'))
  t.deepEqual(session.user.permissions, ['zone.detail.read'])
})
