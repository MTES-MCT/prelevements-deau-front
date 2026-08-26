import test from 'ava'

import {
  buildDashboardMapSearch,
  buildDashboardTerritorySearch
} from './dashboard-api.js'

test('le dashboard peut exclure le corpus de points de sa réponse initiale', t => {
  t.is(
    buildDashboardTerritorySearch({
      includePoints: false,
      period: '2026-08',
      zoneCodes: ['zone-1', 'zone-2']
    }),
    '?zones=zone-1%2Czone-2&period=2026-08&includePoints=false'
  )
})

test('le comportement historique du dashboard conserve les points par défaut', t => {
  t.false(buildDashboardTerritorySearch({periodType: 'month'}).includes('includePoints'))
})

test('la carte territoriale transmet les zones sélectionnées', t => {
  t.is(
    buildDashboardMapSearch({scope: 'territory', zoneCodes: ['zone-1', 'zone-2']}),
    '?scope=territory&zones=zone-1%2Czone-2'
  )
})

test('la carte d’activité ne dépend pas des zones du territoire', t => {
  t.is(
    buildDashboardMapSearch({scope: 'activity', zoneCodes: ['zone-1']}),
    '?scope=activity'
  )
})

test('la carte refuse un périmètre inconnu', t => {
  t.throws(() => buildDashboardMapSearch({scope: 'unknown'}), {
    message: 'scope doit valoir territory ou activity.'
  })
})
