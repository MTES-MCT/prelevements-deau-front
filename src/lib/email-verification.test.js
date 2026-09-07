import test from 'ava'

import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  canResendVerification,
  extractEmailVerification,
  getConfirmationOutcome,
  getEffectiveVerificationStatus,
  getNextVerificationRefreshDelay,
  getResendDelaySeconds,
  isValidEmail,
  normalizeEmail,
  requiresEmailVerificationReauthentication,
  shouldDisplayEmailVerification,
  takeEmailVerificationValue,
  takeEmailVerificationValueOnce,
  upsertEmailVerification
} from './email-verification.js'

test('le jeton est consommé puis effacé du stockage éphémère', t => {
  const calls = []
  const storage = {
    getItem(key) {
      calls.push(['get', key])
      return 'opaque-token'
    },
    removeItem(key) {
      calls.push(['remove', key])
    }
  }

  t.is(takeEmailVerificationValue(storage), 'opaque-token')
  t.deepEqual(calls, [
    ['get', EMAIL_VERIFICATION_STORAGE_KEY],
    ['remove', EMAIL_VERIFICATION_STORAGE_KEY]
  ])
})

test('le jeton n’est lu qu’une fois en mode strict React', t => {
  const readState = {current: false}
  let reads = 0
  const storage = {
    getItem() {
      reads += 1
      return 'opaque-token'
    },
    removeItem() {}
  }

  t.is(takeEmailVerificationValueOnce(storage, readState), 'opaque-token')
  t.is(takeEmailVerificationValueOnce(storage, readState), undefined)
  t.is(reads, 1)
})

test('la normalisation et la validation d’adresse sont cohérentes', t => {
  t.is(normalizeEmail('  Lina.MARTIN@Example.FR '), 'lina.martin@example.fr')
  t.true(isValidEmail('lina@example.fr'))
  t.false(isValidEmail('adresse incomplète'))
})

test('seules les demandes utiles restent affichées sur le compte', t => {
  t.false(shouldDisplayEmailVerification({status: 'VERIFIED'}))
  t.false(shouldDisplayEmailVerification({status: 'CANCELLED'}))
  t.false(shouldDisplayEmailVerification({status: 'SUPERSEDED'}))
  t.true(shouldDisplayEmailVerification({status: 'PENDING'}))
  t.true(shouldDisplayEmailVerification({status: 'SEND_FAILED'}))
  t.true(shouldDisplayEmailVerification({status: 'EXPIRED'}))
  t.true(shouldDisplayEmailVerification({status: 'CONFLICT'}))
})

test('une demande en attente dont la date est dépassée est affichée expirée', t => {
  t.is(getEffectiveVerificationStatus({
    status: 'PENDING',
    expiresAt: '2026-08-30T12:00:00.000Z'
  }, Date.parse('2026-08-31T12:00:00.000Z')), 'EXPIRED')

  t.is(getEffectiveVerificationStatus({
    status: 'SEND_FAILED',
    expiresAt: '2026-08-30T12:00:00.000Z'
  }, Date.parse('2026-08-31T12:00:00.000Z')), 'EXPIRED')
})

test('le délai de renvoi préfère nextResendAt', t => {
  t.is(getResendDelaySeconds({
    status: 'PENDING',
    createdAt: '2026-08-31T12:00:00.000Z',
    nextResendAt: '2026-08-31T12:00:30.000Z'
  }, Date.parse('2026-08-31T12:00:10.000Z')), 20)

  t.is(getResendDelaySeconds({
    status: 'SEND_FAILED',
    createdAt: '2026-08-31T12:00:00.000Z',
    nextResendAt: '2026-08-31T12:00:30.000Z'
  }, Date.parse('2026-08-31T12:00:10.000Z')), 20)
})

test('une demande expirée reste renvoyable sans cooldown', t => {
  const verification = {
    status: 'EXPIRED',
    canResend: true,
    nextResendAt: null
  }

  t.true(canResendVerification(verification))
  t.is(getResendDelaySeconds(verification), 0)
})

test('le prochain rafraîchissement suit le cooldown puis l’expiration', t => {
  const verification = {
    status: 'PENDING',
    createdAt: '2026-08-31T12:00:00.000Z',
    nextResendAt: '2026-08-31T12:00:30.000Z',
    expiresAt: '2026-09-01T12:00:00.000Z'
  }

  t.is(getNextVerificationRefreshDelay(
    [verification],
    Date.parse('2026-08-31T12:00:10.000Z')
  ), 1000)
  t.is(getNextVerificationRefreshDelay(
    [verification],
    Date.parse('2026-08-31T12:01:00.000Z')
  ), Date.parse(verification.expiresAt) - Date.parse('2026-08-31T12:01:00.000Z') + 1)
  t.is(getNextVerificationRefreshDelay([], Date.now()), null)
})

test('les réponses directes et enveloppées fournissent la demande', t => {
  const verification = {id: 'v1', purpose: 'ALIAS_ADD'}
  t.is(extractEmailVerification(verification), verification)
  t.is(extractEmailVerification({verification}), verification)
  t.is(extractEmailVerification({emailVerification: verification}), verification)
})

test('une nouvelle demande remplace la demande de même finalité', t => {
  const previous = [
    {id: 'old-primary', purpose: 'PRIMARY_CHANGE'},
    {id: 'alias', purpose: 'ALIAS_ADD'}
  ]
  const next = {id: 'new-primary', purpose: 'PRIMARY_CHANGE'}

  t.deepEqual(upsertEmailVerification(previous, next), [next, previous[1]])
})

test('les issues publiques sont conservées même pour un statut HTTP d’erreur', t => {
  t.is(getConfirmationOutcome({success: true, data: {outcome: 'VERIFIED'}}), 'VERIFIED')
  t.is(getConfirmationOutcome({success: false, code: 410, data: {outcome: 'EXPIRED'}}), 'EXPIRED')
  t.is(getConfirmationOutcome({success: false, code: 409}), 'CONFLICT')
  t.is(getConfirmationOutcome({success: false, code: 400}), 'INVALID')
})

test('une validation principale impose une reconnexion, contrairement à un alias', t => {
  t.true(requiresEmailVerificationReauthentication({
    outcome: 'VERIFIED',
    purpose: 'PRIMARY_CHANGE',
    requiresReauthentication: true
  }))
  t.true(requiresEmailVerificationReauthentication({
    verification: {id: 'v1', purpose: 'PRIMARY_CHANGE'}
  }))
  t.false(requiresEmailVerificationReauthentication({
    outcome: 'VERIFIED',
    purpose: 'ALIAS_ADD',
    requiresReauthentication: false
  }))
})
