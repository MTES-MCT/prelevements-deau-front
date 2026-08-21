import test from 'ava'

import {
  ADMIN_DASHBOARD_CHART_COLORS,
  ADMIN_DASHBOARD_LATEST_DECLARATIONS_HREF,
  aggregateAdminDashboardActivity,
  buildAdminDashboardDateRangePresets,
  getAdminDashboardDefaultRange,
  getParisDateInput,
  hasAdminDashboardDeclarationActivity
} from './admin-dashboard.js'

test('les couleurs du graphe sont concrètes pour MUI X Charts', t => {
  for (const [key, color] of Object.entries(ADMIN_DASHBOARD_CHART_COLORS)) {
    t.regex(color, /^#[\da-f]{6}$/i, `Invalid chart color for ${key}`)
  }
})

test('la période par défaut couvre le mois courant jusqu’à aujourd’hui', t => {
  t.deepEqual(getAdminDashboardDefaultRange(new Date(2026, 7, 10)), {
    startDate: '2026-08-01',
    endDate: '2026-08-10'
  })
})

test('la date courante est calculée dans le fuseau de Paris', t => {
  t.is(getParisDateInput(new Date('2026-08-10T22:30:00.000Z')), '2026-08-11')
})

test('les raccourcis proposent les périodes opérationnelles attendues', t => {
  const presets = buildAdminDashboardDateRangePresets('2026-08-10')

  t.deepEqual(presets.map(({label}) => label), [
    'Mois en cours',
    '7 derniers jours',
    '30 derniers jours',
    '90 derniers jours',
    'Mois précédent',
    'Année en cours'
  ])
  t.deepEqual(presets[0], {
    label: 'Mois en cours',
    startDate: '2026-08-01',
    endDate: '2026-08-10'
  })
  t.deepEqual(presets[4], {
    label: 'Mois précédent',
    startDate: '2026-07-01',
    endDate: '2026-07-31'
  })
})

test('l’activité reste journalière jusqu’à 90 jours', t => {
  const daily = [
    {date: '2026-08-09', declarations: 2, failed: 0},
    {date: '2026-08-10', declarations: 3, failed: 1}
  ]

  t.deepEqual(aggregateAdminDashboardActivity(daily, 90), {
    granularity: 'day',
    items: daily
  })
})

test('l’activité est regroupée par semaine au-delà de 90 jours', t => {
  const result = aggregateAdminDashboardActivity([
    {
      date: '2026-08-02',
      declarations: 2,
      manualDeclarations: 1,
      spreadsheetDeclarations: 1,
      otherDeclarations: 0,
      failed: 1
    },
    {
      date: '2026-08-03',
      declarations: 3,
      manualDeclarations: 2,
      spreadsheetDeclarations: 1,
      otherDeclarations: 0,
      failed: 0
    },
    {
      date: '2026-08-09',
      declarations: 4,
      manualDeclarations: 1,
      spreadsheetDeclarations: 2,
      otherDeclarations: 1,
      failed: 2
    },
    {
      date: '2026-08-10',
      declarations: 5,
      manualDeclarations: 3,
      spreadsheetDeclarations: 2,
      otherDeclarations: 0,
      failed: 1
    }
  ], 91)

  t.is(result.granularity, 'week')
  t.deepEqual(result.items, [
    {
      date: '2026-07-27',
      declarations: 2,
      manualDeclarations: 1,
      spreadsheetDeclarations: 1,
      otherDeclarations: 0,
      failed: 1
    },
    {
      date: '2026-08-03',
      declarations: 7,
      manualDeclarations: 3,
      spreadsheetDeclarations: 3,
      otherDeclarations: 1,
      failed: 2
    },
    {
      date: '2026-08-10',
      declarations: 5,
      manualDeclarations: 3,
      spreadsheetDeclarations: 2,
      otherDeclarations: 0,
      failed: 1
    }
  ])
})

test('l’état vide du graphe ne dépend pas de la télérelève', t => {
  t.false(hasAdminDashboardDeclarationActivity({
    declarationsReceived: 0,
    telemetryTransmissionsReceived: 12
  }))
  t.true(hasAdminDashboardDeclarationActivity({
    declarationsReceived: 1,
    telemetryTransmissionsReceived: 0
  }))
})

test('le lien vers les dernières déclarations inclut tous les types', t => {
  t.is(
    ADMIN_DASHBOARD_LATEST_DECLARATIONS_HREF,
    '/declarations?types=MANUAL,SPREADSHEET,API'
  )
})
