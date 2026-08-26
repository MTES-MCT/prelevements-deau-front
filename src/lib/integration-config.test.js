import test from 'ava'

import {
  isEnvironmentFlagEnabled,
  resolveMatomoConfig,
  resolveMatomoConfigFromEnvironment,
  serializeInlineScriptValue
} from './integration-config.js'

test('reconnaît les valeurs usuelles qui désactivent une intégration', t => {
  t.true(isEnvironmentFlagEnabled(' true '))
  t.true(isEnvironmentFlagEnabled('1'))
  t.true(isEnvironmentFlagEnabled('YES'))
  t.false(isEnvironmentFlagEnabled('false'))
  t.false(isEnvironmentFlagEnabled(undefined))
})

test('désactive Matomo lorsque sa configuration est absente', t => {
  t.deepEqual(resolveMatomoConfig(), {
    enabled: false,
    siteId: '',
    url: ''
  })
})

test('active Matomo uniquement avec une URL et un site renseignés', t => {
  t.deepEqual(resolveMatomoConfig({
    siteId: ' 12 ',
    url: ' https://stats.example.test/ '
  }), {
    enabled: true,
    siteId: '12',
    url: 'https://stats.example.test/'
  })
})

test('normalise le slash final de l’URL Matomo', t => {
  t.deepEqual(resolveMatomoConfig({
    siteId: '263',
    url: 'https://stats.example.test/matomo'
  }), {
    enabled: true,
    siteId: '263',
    url: 'https://stats.example.test/matomo/'
  })
})

test('refuse une URL ou un identifiant Matomo non sûrs', t => {
  t.false(resolveMatomoConfig({
    siteId: '263',
    url: 'ftp://stats.example.test/'
  }).enabled)
  t.false(resolveMatomoConfig({
    siteId: '</script><script>alert(1)</script>',
    url: 'https://stats.example.test/'
  }).enabled)
})

test('neutralise les fermetures de balise dans les scripts inline', t => {
  t.is(
    serializeInlineScriptValue('https://example.test/</script>?a=1&b=2'),
    '"https://example.test/\\u003c/script\\u003e?a=1\\u0026b=2"'
  )
})

test('le drapeau de désactivation prévaut sur une configuration Matomo complète', t => {
  t.false(resolveMatomoConfig({
    disabled: 'true',
    siteId: '12',
    url: 'https://stats.example.test/'
  }).enabled)
})

test('résout Matomo depuis les variables serveur à l’exécution', t => {
  t.deepEqual(resolveMatomoConfigFromEnvironment({
    MATOMO_DISABLED: 'false',
    MATOMO_SITE_ID: '263',
    MATOMO_URL: 'https://stats.beta.gouv.fr/'
  }), {
    enabled: true,
    siteId: '263',
    url: 'https://stats.beta.gouv.fr/'
  })
})

test('préfère les variables serveur aux anciennes variables publiques', t => {
  t.deepEqual(resolveMatomoConfigFromEnvironment({
    MATOMO_DISABLED: 'true',
    MATOMO_SITE_ID: '263',
    MATOMO_URL: 'https://stats.beta.gouv.fr/',
    NEXT_PUBLIC_MATOMO_DISABLED: 'false',
    NEXT_PUBLIC_MATOMO_SITE_ID: '999',
    NEXT_PUBLIC_MATOMO_URL: 'https://example.test/'
  }), {
    enabled: false,
    siteId: '263',
    url: 'https://stats.beta.gouv.fr/'
  })
})

test('conserve temporairement les anciennes variables Matomo en repli', t => {
  t.true(resolveMatomoConfigFromEnvironment({
    NEXT_PUBLIC_MATOMO_SITE_ID: '263',
    NEXT_PUBLIC_MATOMO_URL: 'https://stats.beta.gouv.fr/'
  }).enabled)
})
