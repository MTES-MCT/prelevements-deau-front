import test from 'ava'

import {
  DEFAULT_DECLARANTS_PAGE_SIZE,
  buildDeclarantsPathname,
  buildDeclarantsSearchQuery,
  readDeclarantsSearchOptions
} from './declarant-search.js'

test('readDeclarantsSearchOptions applique les valeurs par défaut', t => {
  t.deepEqual(readDeclarantsSearchOptions(), {
    page: 1,
    pageSize: DEFAULT_DECLARANTS_PAGE_SIZE,
    query: '',
    role: null,
    emailStatus: null
  })
})

test('readDeclarantsSearchOptions normalise la pagination et les filtres', t => {
  t.deepEqual(readDeclarantsSearchOptions({
    page: ['3', '4'],
    pageSize: '25',
    query: '  Régie  ',
    role: 'preleveur',
    emailStatus: 'without_email'
  }), {
    page: 3,
    pageSize: 25,
    query: 'Régie',
    role: 'PRELEVEUR',
    emailStatus: 'WITHOUT_EMAIL'
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
    emailStatus: null
  })
})

test('buildDeclarantsSearchQuery encode le contrat de l’API', t => {
  t.is(buildDeclarantsSearchQuery({
    page: 2,
    pageSize: 50,
    query: 'ASA & fils',
    role: 'COLLECTEUR',
    emailStatus: 'WITH_EMAIL'
  }), 'page=2&pageSize=50&query=ASA+%26+fils&role=COLLECTEUR&emailStatus=WITH_EMAIL')
})

test('buildDeclarantsPathname conserve les paramètres étrangers et omet les valeurs par défaut', t => {
  t.is(buildDeclarantsPathname(
    '/declarants',
    new URLSearchParams('conserve=oui&page=3&role=PRELEVEUR'),
    {
      page: 1,
      pageSize: 10,
      role: 'ALL',
      emailStatus: 'WITH_EMAIL'
    }
  ), '/declarants?conserve=oui&emailStatus=WITH_EMAIL')
})
