import test from 'ava'

import {
  isEnvironmentFlagEnabled,
  resolveMatomoConfig
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

test('le drapeau de désactivation prévaut sur une configuration Matomo complète', t => {
  t.false(resolveMatomoConfig({
    disabled: 'true',
    siteId: '12',
    url: 'https://stats.example.test/'
  }).enabled)
})
