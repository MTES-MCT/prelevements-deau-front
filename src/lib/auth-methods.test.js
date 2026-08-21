import test from 'ava'

import {
  AUTH_METHODS,
  getSafeCallbackUrl,
  getPasswordLength,
  hasAuthMethod,
  parseAuthConfig,
  validateNewPassword
} from './auth-methods.js'

test('parseAuthConfig conserve l’ordre annoncé par l’API', t => {
  const config = parseAuthConfig({methods: ['password', 'magic_link', 'oidc']})

  t.deepEqual(config.methods, ['password', 'magic_link', 'oidc'])
  t.true(hasAuthMethod(config, AUTH_METHODS.PASSWORD))
})

test('getSafeCallbackUrl conserve seulement une destination interne', t => {
  t.is(getSafeCallbackUrl('/mon-compte?section=securite'), '/mon-compte?section=securite')
  t.is(getSafeCallbackUrl('//example.test'), '/')
  t.is(getSafeCallbackUrl('https://example.test'), '/')
  t.is(getSafeCallbackUrl('/\\evil.example'), '/')
  t.is(getSafeCallbackUrl('/%5Cevil.example'), '/')
  t.is(getSafeCallbackUrl('/%255Cevil.example'), '/')
  t.is(getSafeCallbackUrl(decodeURIComponent('/%5Cevil.example')), '/')
  t.is(getSafeCallbackUrl('/%2F%2Fevil.example'), '/')
  t.is(getSafeCallbackUrl('/mon-compte\nailleurs'), '/')
  t.is(getSafeCallbackUrl('/mon-compte%0Aailleurs'), '/')
  t.is(getSafeCallbackUrl('/%2e%2e//evil.example'), '/')
  t.is(getSafeCallbackUrl('/.%2e//evil.example'), '/')
  t.is(getSafeCallbackUrl('/foo/..//evil.example'), '/')
  t.is(getSafeCallbackUrl('/%252e%252e//evil.example'), '/')
  t.is(getSafeCallbackUrl('/%2E%2E/%2Fevil.example'), '/')
})

test('parseAuthConfig rejette une liste vide, une valeur invalide et les doublons', t => {
  t.throws(() => parseAuthConfig({methods: []}), {instanceOf: TypeError})
  t.throws(() => parseAuthConfig({methods: ['magic-link']}), {instanceOf: TypeError})
  t.throws(() => parseAuthConfig({methods: ['password', 'password']}), {instanceOf: TypeError})
})

test('getPasswordLength compte les caractères Unicode après normalisation NFC', t => {
  t.is(getPasswordLength('e\u0301'), 1)
  t.is(getPasswordLength('🔐'), 1)
})

test('validateNewPassword applique les limites et la confirmation', t => {
  t.is(validateNewPassword('trop-court', 'trop-court'), 'Le mot de passe doit contenir au moins 15 caractères.')
  t.is(validateNewPassword('un mot de passe suffisamment long', 'différent'), 'Les deux mots de passe ne correspondent pas.')
  t.is(validateNewPassword('un mot de passe suffisamment long', 'un mot de passe suffisamment long'), null)
})
