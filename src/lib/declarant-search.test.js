import test from 'ava'

import {
  DEFAULT_DECLARANTS_PAGE_SIZE,
  buildDeclarantsApiSearchQuery,
  buildDeclarantsPathname,
  buildDeclarantsSearchQuery,
  getEffectiveDeclarantsSort,
  hasNonCanonicalDeclarantsSort,
  isDeclarantsSearchResult,
  readDeclarantsSearchOptions
} from './declarant-search.js'

test('readDeclarantsSearchOptions applique les valeurs par défaut', t => {
  t.deepEqual(readDeclarantsSearchOptions(), {
    page: 1,
    pageSize: DEFAULT_DECLARANTS_PAGE_SIZE,
    query: '',
    role: null,
    declarantType: null,
    preleveurType: null,
    emailStatus: null,
    collecteurStatus: null,
    connectorStatus: null,
    activityRange: null,
    zoneIds: [],
    usageCodes: [],
    waterBodyTypes: [],
    exploitationStatuses: [],
    sort: null,
    order: null
  })
})

test('readDeclarantsSearchOptions normalise la pagination et les filtres', t => {
  t.deepEqual(readDeclarantsSearchOptions({
    page: ['3', '4'],
    pageSize: '25',
    query: '  Régie  ',
    role: 'preleveur',
    declarantType: 'legal_person',
    preleveurType: 'irrigant',
    emailStatus: 'without_email',
    collecteurStatus: 'with_collecteur',
    connectorStatus: 'without_connector',
    activityRange: 'days_30_90',
    zoneIds: ['zone-a', 'zone-b'],
    usageCodes: '2,5',
    waterBodyTypes: ['souterrain', 'transition', 'unknown'],
    exploitationStatuses: 'en_activite,terminee',
    sort: 'last_declaration',
    order: 'asc'
  }), {
    page: 3,
    pageSize: 25,
    query: 'Régie',
    role: 'PRELEVEUR',
    declarantType: 'LEGAL_PERSON',
    preleveurType: 'IRRIGANT',
    emailStatus: 'WITHOUT_EMAIL',
    collecteurStatus: 'WITH_COLLECTEUR',
    connectorStatus: 'WITHOUT_CONNECTOR',
    activityRange: 'DAYS_30_90',
    zoneIds: ['zone-a', 'zone-b'],
    usageCodes: ['2', '5'],
    waterBodyTypes: ['SOUTERRAIN', 'TRANSITION'],
    exploitationStatuses: ['EN_ACTIVITE', 'TERMINEE'],
    sort: 'LAST_DECLARATION',
    order: 'ASC'
  })
})

test('readDeclarantsSearchOptions rejette les valeurs hors contrat', t => {
  t.deepEqual(readDeclarantsSearchOptions({
    page: '-2',
    pageSize: '100',
    role: 'ADMIN',
    emailStatus: 'UNKNOWN'
  }), {
    page: 1,
    pageSize: DEFAULT_DECLARANTS_PAGE_SIZE,
    query: '',
    role: null,
    declarantType: null,
    preleveurType: null,
    emailStatus: null,
    collecteurStatus: null,
    connectorStatus: null,
    activityRange: null,
    zoneIds: [],
    usageCodes: [],
    waterBodyTypes: [],
    exploitationStatuses: [],
    sort: null,
    order: null
  })
})

test('buildDeclarantsSearchQuery encode le contrat de l’API', t => {
  t.is(buildDeclarantsSearchQuery({
    page: 2,
    pageSize: 50,
    query: 'ASA & fils',
    role: 'COLLECTEUR',
    declarantType: 'LEGAL_PERSON',
    preleveurType: null,
    emailStatus: 'WITH_EMAIL',
    collecteurStatus: null,
    connectorStatus: 'WITH_CONNECTOR',
    activityRange: 'LT_30_DAYS',
    zoneIds: ['zone-a', 'zone-b'],
    usageCodes: ['2'],
    waterBodyTypes: ['SUPERFICIELLE'],
    exploitationStatuses: ['EN_ACTIVITE'],
    sort: 'RELEVANCE',
    order: 'ASC'
  }), 'page=2&pageSize=50&query=ASA+%26+fils&role=COLLECTEUR&declarantType=LEGAL_PERSON&emailStatus=WITH_EMAIL&connectorStatus=WITH_CONNECTOR&activityRange=LT_30_DAYS&zoneIds=zone-a&zoneIds=zone-b&usageCodes=2&waterBodyTypes=SUPERFICIELLE&exploitationStatuses=EN_ACTIVITE&sort=RELEVANCE&order=ASC')
})

test('le format compact est demandé uniquement par la requête API serveur', t => {
  const options = {page: 1, pageSize: 10, query: 'ferme'}

  t.is(
    buildDeclarantsSearchQuery(options),
    'page=1&pageSize=10&query=ferme'
  )
  t.is(
    buildDeclarantsApiSearchQuery(options),
    'page=1&pageSize=10&query=ferme&format=compact'
  )
})

test('buildDeclarantsPathname conserve les paramètres étrangers et omet les valeurs par défaut', t => {
  t.is(buildDeclarantsPathname(
    '/declarants',
    new URLSearchParams('conserve=oui&page=3&role=PRELEVEUR'),
    {
      page: 1,
      pageSize: 10,
      role: 'ALL',
      emailStatus: 'WITH_EMAIL',
      zoneIds: ['zone-a', 'zone-b']
    }
  ), '/declarants?conserve=oui&emailStatus=WITH_EMAIL&zoneIds=zone-a&zoneIds=zone-b')
})

test('buildDeclarantsPathname accepte les searchParams Next et retire les paramètres forcés', t => {
  t.is(buildDeclarantsPathname(
    '/preleveurs',
    {
      conserve: 'oui',
      role: 'COLLECTEUR',
      collecteurStatus: 'WITH_COLLECTEUR',
      collecteur: 'WITH_COLLECTEUR',
      zoneIds: ['zone-a', 'zone-b']
    },
    {
      role: null,
      collecteurStatus: null,
      collecteur: null
    }
  ), '/preleveurs?conserve=oui&zoneIds=zone-a&zoneIds=zone-b')
})

test('getEffectiveDeclarantsSort réserve la pertinence aux recherches textuelles', t => {
  t.is(getEffectiveDeclarantsSort(), 'NAME')
  t.is(getEffectiveDeclarantsSort({sort: 'RELEVANCE'}), 'NAME')
  t.is(getEffectiveDeclarantsSort({query: 'forage'}), 'RELEVANCE')
  t.is(getEffectiveDeclarantsSort({query: 'forage', sort: 'NAME'}), 'NAME')
})

test('seule une pertinence explicite sans recherche nécessite une URL canonique', t => {
  t.false(hasNonCanonicalDeclarantsSort())
  t.false(hasNonCanonicalDeclarantsSort({sort: 'NAME'}))
  t.false(hasNonCanonicalDeclarantsSort({query: 'forage', sort: 'RELEVANCE'}))
  t.true(hasNonCanonicalDeclarantsSort({sort: 'RELEVANCE'}))
})

test('isDeclarantsSearchResult refuse les erreurs et anciens payloads de liste', t => {
  t.true(isDeclarantsSearchResult({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1
  }))
  t.false(isDeclarantsSearchResult({items: []}))
  t.false(isDeclarantsSearchResult([]))
  t.false(isDeclarantsSearchResult({data: []}))
  t.false(isDeclarantsSearchResult(null))
})
