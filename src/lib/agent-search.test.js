import test from 'ava'

import {
  AGENT_ACCOUNT_STATUSES,
  buildAgentsPathname,
  buildAgentsSearchQuery,
  getCanonicalAgentsSort,
  getEffectiveAgentsSort,
  isAgentsSearchResult,
  readAgentsSearchOptions
} from './agent-search.js'

test('readAgentsSearchOptions applique le périmètre actif par défaut', t => {
  t.deepEqual(readAgentsSearchOptions(), {
    page: 1,
    pageSize: 10,
    query: '',
    accountStatus: 'ACTIVE',
    zoneIds: [],
    accessStatuses: [],
    sort: null,
    order: null
  })
})

test('readAgentsSearchOptions normalise pagination, filtres et tri', t => {
  t.deepEqual(readAgentsSearchOptions({
    page: '2',
    pageSize: '25',
    query: '  Ada  ',
    accountStatus: 'all',
    zoneIds: ['zone-a', 'zone-b'],
    accessStatuses: 'active,none,unknown',
    sort: 'active_zones',
    order: 'desc'
  }), {
    page: 2,
    pageSize: 25,
    query: 'Ada',
    accountStatus: 'ALL',
    zoneIds: ['zone-a', 'zone-b'],
    accessStatuses: ['ACTIVE', 'NONE'],
    sort: 'ACTIVE_ZONES',
    order: 'DESC'
  })
})

test('buildAgentsSearchQuery envoie explicitement le statut actif par défaut', t => {
  t.is(buildAgentsSearchQuery({
    page: 1,
    pageSize: 10,
    accountStatus: AGENT_ACCOUNT_STATUSES.ACTIVE,
    zoneIds: ['zone-a'],
    accessStatuses: ['FUTURE']
  }), 'page=1&pageSize=10&accountStatus=ACTIVE&zoneIds=zone-a&accessStatuses=FUTURE')
})

test('buildAgentsSearchQuery demande la pertinence quand une recherche est saisie', t => {
  t.is(buildAgentsSearchQuery({
    page: 1,
    pageSize: 10,
    accountStatus: AGENT_ACCOUNT_STATUSES.ACTIVE,
    query: 'ada'
  }), 'page=1&pageSize=10&accountStatus=ACTIVE&query=ada&sort=RELEVANCE')
})

test('buildAgentsPathname omet les valeurs par défaut et conserve les paramètres étrangers', t => {
  t.is(buildAgentsPathname(
    '/agents',
    new URLSearchParams('conserve=oui&page=3&accountStatus=ALL'),
    {
      page: 1,
      pageSize: 10,
      accountStatus: 'ACTIVE',
      zoneIds: ['zone-a']
    }
  ), '/agents?conserve=oui&zoneIds=zone-a')
})

test('le tri par pertinence est réservé à une recherche', t => {
  t.is(getEffectiveAgentsSort({sort: 'RELEVANCE'}), 'NAME')
  t.is(getEffectiveAgentsSort({query: 'ada'}), 'RELEVANCE')
  t.is(getEffectiveAgentsSort({query: 'ada', sort: 'CREATED_AT'}), 'CREATED_AT')
})

test('getCanonicalAgentsSort retire ou corrige les directions trompeuses', t => {
  t.deepEqual(getCanonicalAgentsSort({sort: 'RELEVANCE', order: 'DESC'}), {
    sort: null,
    order: null
  })
  t.deepEqual(getCanonicalAgentsSort({sort: null, order: 'DESC'}), {
    sort: null,
    order: null
  })
  t.deepEqual(getCanonicalAgentsSort({sort: 'NAME', order: 'DESC'}), {
    sort: 'NAME',
    order: 'ASC'
  })
  t.deepEqual(getCanonicalAgentsSort({sort: 'CREATED_AT', order: null}), {
    sort: 'CREATED_AT',
    order: 'DESC'
  })
  t.deepEqual(getCanonicalAgentsSort({sort: 'ACTIVE_ZONES', order: 'ASC'}), {
    sort: 'ACTIVE_ZONES',
    order: 'DESC'
  })
  t.deepEqual(getCanonicalAgentsSort({query: 'ada', sort: 'RELEVANCE', order: 'ASC'}), {
    sort: 'RELEVANCE',
    order: 'ASC'
  })
})

test('isAgentsSearchResult valide le contrat paginé', t => {
  t.true(isAgentsSearchResult({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1
  }))
  t.false(isAgentsSearchResult({items: []}))
})
