import test from 'ava'

import {
  getApiPerformancePath,
  getApiSlowRequestThreshold
} from './api-performance.js'

test('anonymise les UUID et supprime la query string des routes API', t => {
  t.is(
    getApiPerformancePath('api/declarants/024ab8c0-6d6f-47a5-b2c3-377420a5cfbf?include=points'),
    'api/declarants/:id'
  )
  t.is(getApiPerformancePath('api/zones/75/declarants?page=2'), 'api/zones/:id/declarants')
  t.is(
    getApiPerformancePath('api/series/024ab8c0-6d6f-47a5-b2c3-377420a5cfbf:VOLUME/values'),
    'api/series/:id/values'
  )
})

test('valide le seuil des requêtes API lentes', t => {
  t.is(getApiSlowRequestThreshold('250'), 250)
  t.is(getApiSlowRequestThreshold('invalid'), 1000)
  t.is(getApiSlowRequestThreshold('-1'), 1000)
})
