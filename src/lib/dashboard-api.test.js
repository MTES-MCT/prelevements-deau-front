import test from 'ava'

import {
  buildDashboardMapSearch,
  buildDashboardTerritorySearch,
  buildDashboardWaterResourceSearch
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

test('les filtres de volume ne demandent que leur bloc et dédupliquent les sections', t => {
  t.is(buildDashboardTerritorySearch({year: 2025, sections: ['volumesByUsage', 'volumesByUsage'], includePoints: false}), '?year=2025&includePoints=false&sections=volumesByUsage')
})

test('les ressources transmettent uniquement la période et les zones demandées', t => {
  t.is(buildDashboardWaterResourceSearch({zoneCodes: ['DEP-33'], period: 'year', includeIps: true}), '?zones=DEP-33&period=year&includeIps=true')
  t.is(buildDashboardWaterResourceSearch({period: 'week', includeIps: false}), '?period=week')
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
