import test from 'ava'

import {
  buildCollecteurAssociationPathname,
  buildCollecteurAssociationQuery,
  getAssociationMutationPayload,
  getCollecteurAssociationChanges,
  getSelectableCandidateIds,
  getSelectionPageState,
  normalizeCollecteurFacetOptions,
  readCollecteurAssociationOptions,
  updateSelectedIds
} from './collecteur-association-search.js'

test('readCollecteurAssociationOptions normalise pagination, listes et tri', t => {
  t.deepEqual(readCollecteurAssociationOptions({
    view: 'available',
    page: '3',
    perPage: '50',
    query: ' forage ',
    zoneIds: ['zone-1,zone-2', 'zone-2'],
    usageCodes: '2,5',
    statuses: 'en_activite,invalide',
    preleveurId: 'preleveur-1',
    sort: 'preleveur_desc'
  }), {
    view: 'AVAILABLE',
    page: 3,
    perPage: 50,
    query: 'forage',
    zoneIds: ['zone-1', 'zone-2'],
    usageCodes: ['2', '5'],
    statuses: ['EN_ACTIVITE'],
    preleveurId: 'preleveur-1',
    sort: 'PRELEVEUR_DESC'
  })
})

test('readCollecteurAssociationOptions ne conserve pas pertinence sans recherche', t => {
  const result = readCollecteurAssociationOptions({sort: 'RELEVANCE'})

  t.is(result.sort, 'POINT_ASC')
  t.is(result.view, 'ASSOCIATED')
  t.is(result.perPage, 25)
})

test('normalizeCollecteurFacetOptions privilégie les libellés métier des statuts', t => {
  t.deepEqual(normalizeCollecteurFacetOptions(
    [{value: 'EN_ACTIVITE', label: 'EN_ACTIVITE', count: 3}],
    [],
    {EN_ACTIVITE: 'En activité'}
  ), [{value: 'EN_ACTIVITE', label: 'En activité', count: 3}])
})

test('buildCollecteurAssociationQuery produit le contrat API idsOnly', t => {
  const query = buildCollecteurAssociationQuery({
    view: 'ASSOCIATED',
    page: 2,
    perPage: 100,
    query: 'captage',
    zoneIds: ['zone-1', 'zone-2'],
    usageCodes: ['2'],
    statuses: ['EN_ACTIVITE'],
    preleveurId: 'preleveur-1',
    sort: 'RELEVANCE'
  }, {idsOnly: true})
  const params = new URLSearchParams(query)

  t.is(params.get('view'), 'ASSOCIATED')
  t.is(params.get('zoneIds'), 'zone-1,zone-2')
  t.is(params.get('idsOnly'), 'true')
  t.is(params.get('sort'), 'RELEVANCE')
})

test('buildCollecteurAssociationPathname remplace les filtres et garde le reste', t => {
  const result = buildCollecteurAssociationPathname(
    '/declarants/collecteur-1/exploitations',
    new URLSearchParams('view=ASSOCIATED&page=4&query=ancien'),
    {
      view: 'AVAILABLE', page: null, query: 'nouveau', zoneIds: ['a', 'b']
    }
  )
  const [, query] = result.split('?')
  const params = new URLSearchParams(query)

  t.is(params.get('view'), 'AVAILABLE')
  t.is(params.get('page'), null)
  t.is(params.get('query'), 'nouveau')
  t.deepEqual(params.getAll('zoneIds'), ['a', 'b'])
})

test('les helpers de sélection excluent les lignes en lecture seule', t => {
  const candidates = [
    {id: '1', canRemove: true, readOnlyReason: null},
    {id: '2', canRemove: false, readOnlyReason: 'Lecture seule'},
    {id: '3', canRemove: true, readOnlyReason: null}
  ]
  const pageIds = getSelectableCandidateIds(candidates, 'ASSOCIATED')
  const selection = updateSelectedIds(new Set(['hors-page']), pageIds, true)

  t.deepEqual(pageIds, ['1', '3'])
  t.deepEqual([...selection], ['hors-page', '1', '3'])
  t.deepEqual(getSelectionPageState(selection, pageIds), {
    selectedOnPage: 2,
    checked: true,
    indeterminate: false
  })
})

test('getAssociationMutationPayload sépare ajout et retrait', t => {
  t.deepEqual(getAssociationMutationPayload('AVAILABLE', ['1', '1', '2']), {
    addExploitationIds: ['1', '2'],
    removeExploitationIds: []
  })
  t.deepEqual(getAssociationMutationPayload('ASSOCIATED', ['3']), {
    addExploitationIds: [],
    removeExploitationIds: ['3']
  })
})

test('getCollecteurAssociationChanges omet une liste inchangée et protège une modification', t => {
  t.deepEqual(getCollecteurAssociationChanges(['b', 'a'], ['a', 'b', 'a']), {})
  t.deepEqual(getCollecteurAssociationChanges(['a', 'b'], ['b', 'c']), {
    collecteurUserIds: ['b', 'c'],
    expectedCollecteurUserIds: ['a', 'b']
  })
  t.deepEqual(getCollecteurAssociationChanges(['a'], []), {
    collecteurUserIds: [],
    expectedCollecteurUserIds: ['a']
  })
})
