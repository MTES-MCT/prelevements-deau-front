import test from 'ava'

import {
  buildDeclarationFeedSearchParams,
  mergeDeclarationFeedEntries,
  normalizeDeclarationFeedPagination
} from './declaration-feed.js'

test('construit les paramètres du flux sans encoder manuellement le curseur', t => {
  const searchParameters = buildDeclarationFeedSearchParams({
    cursor: 'curseur+avec/caractères=',
    limit: 50
  })

  t.is(searchParameters.get('cursor'), 'curseur+avec/caractères=')
  t.is(searchParameters.get('limit'), '50')
  t.is(searchParameters.toString(), 'cursor=curseur%2Bavec%2Fcaract%C3%A8res%3D&limit=50')
})

test('utilise la limite par défaut sans curseur', t => {
  const searchParameters = buildDeclarationFeedSearchParams()

  t.is(searchParameters.toString(), 'limit=20')
})

test('désactive les métadonnées globales sur les pages suivantes', t => {
  const searchParameters = buildDeclarationFeedSearchParams({
    cursor: 'opaque',
    includeMeta: false,
    limit: 50
  })

  t.is(searchParameters.toString(), 'cursor=opaque&includeMeta=false&limit=50')
})

test('fusionne les pages dans leur ordre et déduplique leurs entrées', t => {
  const firstPage = [{id: 'a'}, {id: 'b'}]
  const secondPage = [{id: 'b'}, {id: 'c'}, null, {}]

  t.deepEqual(mergeDeclarationFeedEntries(firstPage, secondPage), [
    {id: 'a'},
    {id: 'b'},
    {id: 'c'}
  ])
})

test('normalise une pagination incohérente sans exposer de curseur inutilisable', t => {
  t.deepEqual(normalizeDeclarationFeedPagination({
    hasNext: false,
    limit: 50,
    nextCursor: 'à-ignorer'
  }), {
    hasNext: false,
    limit: 50,
    nextCursor: null
  })

  t.deepEqual(normalizeDeclarationFeedPagination({
    hasNext: true,
    limit: 0,
    nextCursor: null
  }), {
    hasNext: true,
    limit: 20,
    nextCursor: null
  })
})
