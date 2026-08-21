import test from 'ava'

import {
  getPasswordAccessActionAvailability,
  getPasswordAccessCurrentUserId
} from './password-accesses.js'

test('extrait l’identifiant depuis la forme réelle de la réponse /info', t => {
  t.is(getPasswordAccessCurrentUserId({
    role: 'ADMIN',
    user: {id: 'admin-1'}
  }), 'admin-1')
  t.is(getPasswordAccessCurrentUserId({role: 'ADMIN'}), null)
  t.is(getPasswordAccessCurrentUserId({id: 'ancienne-forme'}), null)
})

test('les actions administratives sont interdites sur son propre compte', t => {
  t.deepEqual(
    getPasswordAccessActionAvailability({
      currentUserId: 'admin-1',
      status: 'ACTIVE',
      userId: 'admin-1'
    }),
    {
      identityAvailable: true,
      isOwnAccount: true,
      canCreateActivation: false,
      canRevoke: false
    }
  )
})

test('les actions restent disponibles sur le compte d’un autre utilisateur', t => {
  t.deepEqual(
    getPasswordAccessActionAvailability({
      currentUserId: 'admin-1',
      status: 'ACTIVE',
      userId: 'user-2'
    }),
    {
      identityAvailable: true,
      isOwnAccount: false,
      canCreateActivation: true,
      canRevoke: true
    }
  )

  t.false(getPasswordAccessActionAvailability({
    currentUserId: 'admin-1',
    status: 'NONE',
    userId: 'user-2'
  }).canRevoke)
})

test('échoue fermé quand l’identité de l’administrateur est absente', t => {
  t.deepEqual(
    getPasswordAccessActionAvailability({
      currentUserId: null,
      status: 'ACTIVE',
      userId: 'user-2'
    }),
    {
      identityAvailable: false,
      isOwnAccount: false,
      canCreateActivation: false,
      canRevoke: false
    }
  )
})
