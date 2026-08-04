import test from 'ava'

import {buildCurrentSessionInfo} from './current-session-info.js'

test('réutilise les droits déjà présents dans la session', t => {
  const user = {
    id: 'user-1',
    token: 'api-token',
    role: 'INSTRUCTOR',
    permissions: ['declarant.list'],
    impersonation: {active: true},
    declarantRole: 'PRELEVEUR'
  }

  t.deepEqual(buildCurrentSessionInfo({user}), {
    role: 'INSTRUCTOR',
    permissions: ['declarant.list'],
    impersonation: {active: true},
    declarantRole: 'PRELEVEUR',
    user
  })
})

test('refuse une session sans jeton API', t => {
  t.is(buildCurrentSessionInfo({user: {role: 'ADMIN'}}), null)
  t.is(buildCurrentSessionInfo(null), null)
})
