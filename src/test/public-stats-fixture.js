// Synthetic, public aggregates shared by the browser API fixture and UI tests.
export function createPublicStatsFixture(month = '2026-08') {
  const territory = {
    id: 'sage-test',
    name: 'SAGE de démonstration',
    pointsCount: 12,
    preleveursCount: 10,
    reportingPreleveursCount: month === '2026-07' ? 3 : 7,
    reportingRate: month === '2026-07' ? 30 : 70,
    deploymentMonth: null,
    profiles: [
      {key: 'AGRICULTURE', label: 'Agriculture', count: 8, reportingCount: month === '2026-07' ? 2 : 5},
      {key: 'INDUSTRY', label: 'Industrie', count: 2, reportingCount: month === '2026-07' ? 1 : 2}
    ]
  }

  return {
    month,
    generatedAt: new Date().toISOString(),
    availableMonths: ['2026-06', '2026-07', '2026-08'],
    totals: {pointsCount: 12, preleveursCount: 10, sageCount: 1, departmentCount: 1},
    territories: {
      SAGE: [territory],
      DEPARTEMENT: [{...territory, id: 'dep-test', name: 'Département de démonstration', deploymentMonth: '2026-03'}]
    },
    channels: [
      {key: 'DIRECT', count: month === '2026-07' ? 1 : 5, percentage: month === '2026-07' ? 33.33 : 71.43},
      {key: 'THIRD_PARTY', count: 2, percentage: month === '2026-07' ? 66.67 : 28.57}
    ],
    publicVisitors: {
      website: 'https://partageonsleau.beta.gouv.fr/',
      fetchedAt: new Date().toISOString(),
      months: [
        {month: '2026-03', uniqueVisitors: null, status: 'unavailable'},
        {month: '2026-04', uniqueVisitors: 0, status: 'complete'},
        {month: '2026-05', uniqueVisitors: 25, status: 'complete'},
        {month: '2026-06', uniqueVisitors: 31, status: 'complete'},
        {month: '2026-07', uniqueVisitors: 48, status: 'complete'},
        {month: '2026-08', uniqueVisitors: 52, status: 'complete'}
      ]
    },
    activeUsers: {
      availableSince: '2026-04-12T10:00:00Z',
      collectionStartedAt: '2026-06-15T10:00:00Z',
      months: [
        {month: '2026-03', administration: null, declarants: null, total: null, status: 'unavailable'},
        {month: '2026-04', administration: 1, declarants: 2, total: 3, status: 'partial'},
        {month: '2026-05', administration: 2, declarants: 3, total: 5, status: 'partial'},
        {month: '2026-06', administration: 3, declarants: 4, total: 7, status: 'partial'},
        {month: '2026-07', administration: 3, declarants: 5, total: 8, status: 'available'},
        {month: '2026-08', administration: 4, declarants: 6, total: 10, status: 'available'}
      ]
    }
  }
}
