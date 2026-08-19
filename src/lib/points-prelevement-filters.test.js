import test from 'ava'

import {
  MISSING_PRELEVEUR_TYPE,
  MISSING_USAGE_KEY,
  MISSING_WATER_BODY_TYPE,
  NO_EXPLOITATION_STATUS,
  countPointsByUsage,
  createPointFilterIndex,
  filterPoints,
  filterPointsWithScores,
  getDefaultPointFilters,
  getPointFacetCounts,
  getPointFilterOptions,
  getPointFiltersFromSearchParams,
  getPointUsageRootKeys,
  getSearchParamsWithPointFilters,
  getUsageOptionsForPoints,
  getWaterBodyTypeOptionsForPoints,
  haveSameSelection,
  pointMatchesSearch
} from './points-prelevement-filters.js'
import {createPointPrelevementFeatures} from './points-prelevement.js'

const points = [
  {
    id: 'point-1',
    name: 'Forage de l’Étang',
    codeBSS: '10972X0137/PONT',
    usageName: 'Source nord',
    flowType: 'PRELEVEMENT',
    waterBodyType: 'SOUTERRAIN',
    usages: [
      {id: 'usage-2a', code: '2A', label: 'Aspersion'},
      {id: 'usage-5', code: '5', label: 'AEP'}
    ],
    searchAliases: ['Captage du Pont'],
    searchIdentifiers: ['BNPE-001'],
    communeName: 'Saint-Estève',
    managementZones: [{id: 'zone-1', name: 'Plaine du Roussillon', code: 'MGT-66'}],
    exploitationStatuses: ['EN_ACTIVITE'],
    preleveurLabels: ['Élevage des Pyrénées'],
    preleveurSirets: ['123 456 789 00012'],
    preleveurTypes: ['IRRIGANT'],
    collecteurStatus: 'WITH_COLLECTEUR',
    connectorStatus: 'WITH_CONNECTOR',
    searchAccess: {declarants: true, exploitations: true}
  },
  {
    id: 'point-2',
    name: 'Exutoire communal',
    flowType: 'REJET',
    waterBodyType: 'SUPERFICIELLE',
    usages: [{id: 'usage-4', code: '4', label: 'Industrie'}],
    managementZones: [{id: 'zone-2', name: 'Littoral', code: null}],
    exploitationStatuses: [],
    preleveurTypes: [],
    collecteurStatus: 'WITHOUT_COLLECTEUR',
    connectorStatus: 'WITHOUT_CONNECTOR',
    searchAccess: {declarants: true, exploitations: true}
  },
  {
    id: 'point-3',
    name: 'Point incomplet',
    flowType: 'PRELEVEMENT',
    waterBodyType: null,
    usages: [],
    exploitationStatuses: [],
    preleveurTypes: [],
    collecteurStatus: 'WITHOUT_COLLECTEUR',
    connectorStatus: 'WITHOUT_CONNECTOR',
    searchAccess: {declarants: false, exploitations: false}
  }
]

const allFilters = {
  query: '',
  usageKeys: ['2', '4', '5', MISSING_USAGE_KEY],
  flowTypes: ['PRELEVEMENT', 'REJET'],
  waterBodyTypes: ['SOUTERRAIN', 'SUPERFICIELLE', MISSING_WATER_BODY_TYPE],
  managementZoneIds: ['zone-1', 'zone-2'],
  exploitationStatuses: ['EN_ACTIVITE', NO_EXPLOITATION_STATUS],
  collecteurStatuses: ['WITH_COLLECTEUR', 'WITHOUT_COLLECTEUR'],
  connectorStatuses: ['WITH_CONNECTOR', 'WITHOUT_CONNECTOR'],
  preleveurTypes: ['IRRIGANT'],
  sort: 'RELEVANCE'
}

test('la recherche couvre le nom, le nom d’usage, le BSS et l’identifiant sans tenir compte des accents', t => {
  t.true(pointMatchesSearch(points[0], 'etang'))
  t.true(pointMatchesSearch(points[0], 'SOURCE NORD'))
  t.true(pointMatchesSearch(points[0], '10972x0137'))
  t.true(pointMatchesSearch(points[0], 'point-1'))
  t.false(pointMatchesSearch(points[0], 'communal'))
})

test('la recherche intelligente couvre aliases, commune, codes, usages, zones et préleveurs autorisés', t => {
  const index = createPointFilterIndex(points)

  for (const query of [
    'capt pont',
    'saint esteve',
    'bnpe001',
    'asperssion',
    'roussillon',
    'elevage pyrenees',
    '12345678900012'
  ]) {
    t.true(pointMatchesSearch(points[0], query, index), `requête ${query}`)
  }

  t.false(pointMatchesSearch(points[2], 'preleveur masque', index))
})

test('les codes alphabétiques restent exacts sans correction approximative', t => {
  const point = {
    id: 'point-code',
    name: 'Captage communal',
    usages: [{id: 'usage-code', code: 'IRRG', label: 'Irrigation'}],
    managementZones: [{id: 'zone-code', name: 'Secteur nord', code: 'ZONEA'}],
    searchAccess: {declarants: false, exploitations: false}
  }

  t.true(pointMatchesSearch(point, 'irrg'))
  t.true(pointMatchesSearch(point, 'zonea'))
  t.false(pointMatchesSearch(point, 'irrd'))
  t.false(pointMatchesSearch(point, 'zoneb'))
})

test('le score place un identifiant exact avant un nom approximatif', t => {
  const index = createPointFilterIndex(points)
  const result = filterPointsWithScores(points, {...allFilters, query: '10972X0137/PONT'}, index)

  t.deepEqual(result.points.map(point => point.id), ['point-1'])
  t.true(result.scores.get('point-1') > 0)
  t.is(result.scores.size, 1)
})

test('l’index de filtres pré-calcule les recherches et les facettes sans modifier les points', t => {
  const index = createPointFilterIndex(points)

  t.true(pointMatchesSearch(points[0], 'etang', index))
  t.deepEqual(filterPoints(points, {
    ...allFilters,
    query: 'source nord'
  }, index).map(point => point.id), ['point-1'])
  t.false(Object.hasOwn(points[0], 'searchText'))
})

test('les sous-usages sont regroupés sous leur usage racine', t => {
  t.deepEqual(getPointUsageRootKeys(points[0]), ['2', '5'])
  t.deepEqual(getPointUsageRootKeys(points[2]), [MISSING_USAGE_KEY])

  const options = getUsageOptionsForPoints(points)
  t.deepEqual(options.map(option => option.value), ['2', '4', '5', MISSING_USAGE_KEY])
  t.is(options.at(-1).label, 'Sans usage renseigné')
})

test('les types de milieu présents et la valeur non renseignée deviennent filtrables', t => {
  t.deepEqual(
    getWaterBodyTypeOptionsForPoints(points).map(option => option.value),
    ['SOUTERRAIN', 'SUPERFICIELLE', MISSING_WATER_BODY_TYPE]
  )
})

test('les facettes sont construites depuis les champs autorisés du résumé cartographique', t => {
  const index = createPointFilterIndex(points)
  const options = getPointFilterOptions(points, index)

  t.deepEqual(options.managementZoneOptions.map(option => option.value), ['zone-2', 'zone-1'])
  t.deepEqual(
    options.exploitationStatusOptions.map(option => option.value),
    ['EN_ACTIVITE', NO_EXPLOITATION_STATUS]
  )
  t.deepEqual(options.collecteurStatusOptions.map(option => option.value), [
    'WITH_COLLECTEUR',
    'WITHOUT_COLLECTEUR'
  ])
  t.deepEqual(options.preleveurTypeOptions.map(option => option.value), ['IRRIGANT'])
  t.false(options.exploitationStatusOptions.some(option => option.value === 'UNKNOWN'))
})

test('un accès absent n’est jamais interprété comme une exploitation ou un type manquant', t => {
  const inaccessiblePoint = points[2]
  const withMissingType = {
    ...points[0],
    id: 'point-4',
    preleveurTypes: []
  }
  const index = createPointFilterIndex([inaccessiblePoint, withMissingType])
  const options = getPointFilterOptions([inaccessiblePoint, withMissingType], index)

  t.deepEqual(options.exploitationStatusOptions.map(option => option.value), ['EN_ACTIVITE'])
  t.deepEqual(options.preleveurTypeOptions.map(option => option.value), [MISSING_PRELEVEUR_TYPE])
})

test('les familles de filtres se combinent avec ET et les valeurs avec OU', t => {
  t.deepEqual(filterPoints(points, {
    ...allFilters,
    usageKeys: ['2', '4'],
    flowTypes: ['PRELEVEMENT']
  }).map(point => point.id), ['point-1'])

  t.deepEqual(filterPoints(points, {
    ...allFilters,
    usageKeys: ['4'],
    flowTypes: ['REJET'],
    waterBodyTypes: ['SUPERFICIELLE']
  }).map(point => point.id), ['point-2'])

  t.deepEqual(filterPoints(points, {
    ...allFilters,
    usageKeys: [MISSING_USAGE_KEY],
    waterBodyTypes: [MISSING_WATER_BODY_TYPE]
  }).map(point => point.id), ['point-3'])

  t.deepEqual(filterPoints(points, {
    ...allFilters,
    managementZoneIds: ['zone-1'],
    exploitationStatuses: ['EN_ACTIVITE'],
    collecteurStatuses: ['WITH_COLLECTEUR'],
    connectorStatuses: ['WITH_CONNECTOR'],
    preleveurTypes: ['IRRIGANT']
  }).map(point => point.id), ['point-1'])
})

test('les décomptes d’une facette appliquent les autres filtres sans s’auto-exclure', t => {
  const index = createPointFilterIndex(points)
  const filters = {
    ...allFilters,
    managementZoneIds: ['zone-1'],
    exploitationStatuses: ['EN_ACTIVITE']
  }
  const searchResult = filterPointsWithScores(points, filters, index)
  const counts = getPointFacetCounts(points, filters, index, searchResult.scores)

  t.is(searchResult.scores.size, points.length)
  t.is(counts.managementZoneIds['zone-1'], 1)
  t.is(counts.managementZoneIds['zone-2'], 0)
  t.is(counts.exploitationStatuses.EN_ACTIVITE, 1)
  t.is(counts.exploitationStatuses[NO_EXPLOITATION_STATUS], 0)
})

test('un point multi-usage contribue au décompte de chaque usage', t => {
  const options = getUsageOptionsForPoints(points)
  t.deepEqual(countPointsByUsage(points, options), {
    2: 1,
    4: 1,
    5: 1,
    [MISSING_USAGE_KEY]: 1
  })
})

test('la carte encode uniquement l’icône des usages visibles et les propriétés utiles', t => {
  const collection = createPointPrelevementFeatures([points[0]], {
    visibleUsageKeys: ['2']
  })
  const {properties} = collection.features[0]

  t.is(properties.icon, 'marker-usages-2')
  t.deepEqual(Object.keys(properties).sort(), ['icon', 'id', 'name', 'textOffset'])
  t.is(points[0].usages.length, 2)
})

test('la comparaison de sélections ignore leur ordre', t => {
  t.true(haveSameSelection(['2', '5'], ['5', '2']))
  t.false(haveSameSelection(['2'], ['2', '5']))
})

test('les filtres sont restaurés depuis les paramètres de l’URL', t => {
  const searchParams = new URLSearchParams([
    ['recherche', 'forage'],
    ['usage', '2'],
    ['usage', '5'],
    ['type-point', 'REJET'],
    ['type-milieu', 'SOUTERRAIN'],
    ['zone', 'zone-1'],
    ['statut-exploitation', 'EN_ACTIVITE'],
    ['collecteur', 'WITH_COLLECTEUR'],
    ['connecteur', 'WITH_CONNECTOR'],
    ['type-preleveur', 'IRRIGANT'],
    ['tri', 'nom']
  ])

  t.deepEqual(getPointFiltersFromSearchParams(searchParams, allFilters), {
    query: 'forage',
    usageKeys: ['2', '5'],
    flowTypes: ['REJET'],
    waterBodyTypes: ['SOUTERRAIN'],
    managementZoneIds: ['zone-1'],
    exploitationStatuses: ['EN_ACTIVITE'],
    collecteurStatuses: ['WITH_COLLECTEUR'],
    connectorStatuses: ['WITH_CONNECTOR'],
    preleveurTypes: ['IRRIGANT'],
    sort: 'NAME'
  })
})

test('une sélection vide est distinguée de l’absence de filtre dans l’URL', t => {
  const searchParams = new URLSearchParams([
    ['usage', 'aucun'],
    ['type-point', 'inconnu']
  ])

  const filters = getPointFiltersFromSearchParams(searchParams, allFilters)
  t.deepEqual(filters.usageKeys, [])
  t.deepEqual(filters.flowTypes, allFilters.flowTypes)
  t.deepEqual(filters.waterBodyTypes, allFilters.waterBodyTypes)
  t.deepEqual(filters.managementZoneIds, allFilters.managementZoneIds)
})

test('la sérialisation conserve les paramètres étrangers et omet les filtres par défaut', t => {
  const searchParams = new URLSearchParams('point-prelevement=point-1&conserve=oui')
  const nextSearchParams = getSearchParamsWithPointFilters(searchParams, {
    ...allFilters,
    query: '  source nord  ',
    usageKeys: ['5'],
    flowTypes: [],
    managementZoneIds: ['zone-1'],
    exploitationStatuses: ['EN_ACTIVITE'],
    collecteurStatuses: ['WITH_COLLECTEUR'],
    connectorStatuses: ['WITH_CONNECTOR'],
    preleveurTypes: ['IRRIGANT'],
    sort: 'NAME'
  }, allFilters)

  t.is(nextSearchParams.get('point-prelevement'), 'point-1')
  t.is(nextSearchParams.get('conserve'), 'oui')
  t.is(nextSearchParams.get('recherche'), 'source nord')
  t.deepEqual(nextSearchParams.getAll('usage'), ['5'])
  t.deepEqual(nextSearchParams.getAll('type-point'), ['aucun'])
  t.false(nextSearchParams.has('type-milieu'))
  t.deepEqual(nextSearchParams.getAll('zone'), ['zone-1'])
  t.deepEqual(nextSearchParams.getAll('statut-exploitation'), ['EN_ACTIVITE'])
  t.is(nextSearchParams.get('collecteur'), 'WITH_COLLECTEUR')
  t.is(nextSearchParams.get('connecteur'), 'WITH_CONNECTOR')
  t.false(nextSearchParams.has('type-preleveur'))
  t.is(nextSearchParams.get('tri'), 'nom')
})

test('le tri alphabétique implicite sans recherche n’alourdit pas l’URL', t => {
  const nextSearchParams = getSearchParamsWithPointFilters(
    new URLSearchParams('tri=nom'),
    {...allFilters, sort: 'NAME'},
    allFilters
  )

  t.false(nextSearchParams.has('tri'))
})

test('les filtres par défaut reprennent toutes les valeurs de facettes disponibles', t => {
  const index = createPointFilterIndex(points)
  const options = getPointFilterOptions(points, index)
  const filters = getDefaultPointFilters({
    ...options,
    flowTypes: ['PRELEVEMENT', 'REJET']
  })

  t.deepEqual(filters.managementZoneIds, ['zone-2', 'zone-1'])
  t.deepEqual(filters.exploitationStatuses, ['EN_ACTIVITE', NO_EXPLOITATION_STATUS])
  t.deepEqual(filters.preleveurTypes, ['IRRIGANT'])
})
