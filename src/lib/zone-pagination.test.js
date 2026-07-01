import test from 'ava'

import {
  DEFAULT_ZONE_PER_PAGE,
  readListOptions,
  unwrapPaginatedData
} from './zone-pagination.js'

test('readListOptions applique les valeurs par défaut', t => {
  t.deepEqual(readListOptions(), {
    page: 1,
    perPage: DEFAULT_ZONE_PER_PAGE,
    search: ''
  })
})

test('readListOptions normalise page, taille et recherche', t => {
  t.deepEqual(readListOptions({
    page: '3',
    perPage: '50',
    search: '  ASA  '
  }), {
    page: 3,
    perPage: 50,
    search: 'ASA'
  })
})

test('readListOptions ignore les nombres invalides et garde les filtres non vides', t => {
  t.deepEqual(readListOptions({
    page: '-1',
    perPage: '0',
    usage: ' 2 ',
    status: ['active'],
    email: '   '
  }), {
    page: 1,
    perPage: DEFAULT_ZONE_PER_PAGE,
    search: '',
    usage: '2',
    status: 'active'
  })
})

test('unwrapPaginatedData enveloppe un tableau simple', t => {
  t.deepEqual(unwrapPaginatedData([{id: 1}, {id: 2}]), {
    data: [{id: 1}, {id: 2}],
    meta: {
      page: 1,
      perPage: DEFAULT_ZONE_PER_PAGE,
      pages: 1,
      total: 2,
      totalAll: 2,
      count: 2,
      search: null,
      filters: {}
    }
  })
})

test('unwrapPaginatedData conserve les métadonnées API', t => {
  t.deepEqual(unwrapPaginatedData({
    data: [{id: 1}],
    meta: {
      page: 2,
      perPage: 10,
      pages: 4,
      total: 35,
      totalAll: 100,
      count: 10,
      search: 'asa',
      filters: {usage: '2'}
    }
  }), {
    data: [{id: 1}],
    meta: {
      page: 2,
      perPage: 10,
      pages: 4,
      total: 35,
      totalAll: 100,
      count: 10,
      search: 'asa',
      filters: {usage: '2'}
    }
  })
})

test('unwrapPaginatedData utilise le fallback quand la donnée API est absente', t => {
  t.deepEqual(unwrapPaginatedData({meta: {total: 0}}, [{id: 'fallback'}]), {
    data: [{id: 'fallback'}],
    meta: {
      page: 1,
      perPage: DEFAULT_ZONE_PER_PAGE,
      pages: 1,
      total: 0,
      totalAll: 0,
      count: 1,
      search: null,
      filters: {}
    }
  })
})
