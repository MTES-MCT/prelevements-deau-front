import test from 'ava'

import {
  MISSING_USAGE_KEY,
  MISSING_WATER_BODY_TYPE,
  countPointsByUsage,
  createPointFilterIndex,
  filterPoints,
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
    ]
  },
  {
    id: 'point-2',
    name: 'Exutoire communal',
    flowType: 'REJET',
    waterBodyType: 'SUPERFICIELLE',
    usages: [{id: 'usage-4', code: '4', label: 'Industrie'}]
  },
  {
    id: 'point-3',
    name: 'Point incomplet',
    flowType: 'PRELEVEMENT',
    waterBodyType: null,
    usages: []
  }
]

const allFilters = {
  query: '',
  usageKeys: ['2', '4', '5', MISSING_USAGE_KEY],
  flowTypes: ['PRELEVEMENT', 'REJET'],
  waterBodyTypes: ['SOUTERRAIN', 'SUPERFICIELLE', MISSING_WATER_BODY_TYPE]
}

test('la recherche couvre le nom, le nom d’usage, le BSS et l’identifiant sans tenir compte des accents', t => {
  t.true(pointMatchesSearch(points[0], 'etang'))
  t.true(pointMatchesSearch(points[0], 'SOURCE NORD'))
  t.true(pointMatchesSearch(points[0], '10972x0137'))
  t.true(pointMatchesSearch(points[0], 'point-1'))
  t.false(pointMatchesSearch(points[0], 'communal'))
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
    ['type-milieu', 'SOUTERRAIN']
  ])

  t.deepEqual(getPointFiltersFromSearchParams(searchParams, allFilters), {
    query: 'forage',
    usageKeys: ['2', '5'],
    flowTypes: ['REJET'],
    waterBodyTypes: ['SOUTERRAIN']
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
})

test('la sérialisation conserve les paramètres étrangers et omet les filtres par défaut', t => {
  const searchParams = new URLSearchParams('point-prelevement=point-1&conserve=oui')
  const nextSearchParams = getSearchParamsWithPointFilters(searchParams, {
    ...allFilters,
    query: '  source nord  ',
    usageKeys: ['5'],
    flowTypes: []
  }, allFilters)

  t.is(nextSearchParams.get('point-prelevement'), 'point-1')
  t.is(nextSearchParams.get('conserve'), 'oui')
  t.is(nextSearchParams.get('recherche'), 'source nord')
  t.deepEqual(nextSearchParams.getAll('usage'), ['5'])
  t.deepEqual(nextSearchParams.getAll('type-point'), ['aucun'])
  t.false(nextSearchParams.has('type-milieu'))
})
