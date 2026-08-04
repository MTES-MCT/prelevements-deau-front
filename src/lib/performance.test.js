import test from 'ava'

import {
  getMatomoMetricValue,
  normalizeRoutePattern
} from './performance.js'

test('normalizeRoutePattern masque les identifiants dynamiques', t => {
  t.is(
    normalizeRoutePattern('/declarants/024ab8c0-6d6f-47a5-b2c3-377420a5cfbf'),
    '/declarants/[id]'
  )
  t.is(normalizeRoutePattern('/zones/75/points-prelevement'), '/zones/[id]/points-prelevement')
})

test('normalizeRoutePattern retire la query string sans modifier les routes statiques', t => {
  t.is(normalizeRoutePattern('/tableau-de-bord?annee=2026'), '/tableau-de-bord')
  t.is(normalizeRoutePattern('/'), '/')
})

test('getMatomoMetricValue conserve les millisecondes et précise CLS', t => {
  t.is(getMatomoMetricValue({name: 'LCP', value: 1450.4}), 1450)
  t.is(getMatomoMetricValue({name: 'CLS', value: 0.0874}), 87)
})
