import test from 'ava'

import {
  SEARCH_SORT_MODES,
  compactSearchValue,
  createSearchDocument,
  normalizeSearchValue,
  rankSearchItems,
  scoreSearchDocument
} from './smart-search.js'

const document = createSearchDocument([
  {value: 'Forage de l’Étang', weight: 8},
  {value: '10972X0137/PONT', weight: 10, identifier: true},
  {value: ['ASA des Albères', 'Perpignan'], weight: 3}
])

test('normalise les accents, ligatures et séparateurs français', t => {
  t.is(normalizeSearchValue('  Cœur-d’Eau / Étang  '), 'coeur d eau etang')
  t.is(compactSearchValue('10972X 0137/PONT'), '10972x0137pont')
})

test('classe identifiant exact, expression exacte, préfixe, partiel puis approximation', t => {
  const exactIdentifier = scoreSearchDocument(document, '10972X0137/PONT')
  const exactPhrase = scoreSearchDocument(document, 'forage de l etang')
  const prefix = scoreSearchDocument(document, 'forage de')
  const partial = scoreSearchDocument(document, 'de l etang')
  const fuzzy = scoreSearchDocument(document, 'forrage')

  t.true(exactIdentifier > exactPhrase)
  t.true(exactPhrase > prefix)
  t.true(prefix > partial)
  t.true(partial > fuzzy)
})

test('retrouve des termes partiels dans des champs différents et dans un ordre libre', t => {
  t.not(scoreSearchDocument(document, 'perpi forage'), null)
  t.not(scoreSearchDocument(document, 'alber etang'), null)
  t.is(scoreSearchDocument(document, 'perpi inconnu'), null)
})

test('tolère prudemment les fautes longues mais pas les mots courts ni les identifiants', t => {
  t.not(scoreSearchDocument(document, 'forrage'), null)
  t.not(scoreSearchDocument(document, 'froage'), null)
  t.not(scoreSearchDocument(document, 'perpignam'), null)
  t.is(scoreSearchDocument(document, 'asb'), null)
  t.is(scoreSearchDocument(document, '10972X0138/PONT'), null)
})

test('rankSearchItems utilise la pertinence seulement avec une requête et stabilise les égalités', t => {
  const items = [
    {id: '2', name: 'Forage secondaire'},
    {id: '1', name: 'Forage'},
    {id: '3', name: 'Captage'}
  ]
  const getDocument = item => createSearchDocument([{value: item.name, weight: 8}])

  t.deepEqual(
    rankSearchItems(items, {getDocument, query: 'forage'}).map(result => result.item.id),
    ['1', '2']
  )
  t.deepEqual(
    rankSearchItems(items, {getDocument, query: 'forage', sort: SEARCH_SORT_MODES.NAME})
      .map(result => result.item.id),
    ['1', '2']
  )
  t.deepEqual(
    rankSearchItems(items, {getDocument, query: ''}).map(result => result.item.id),
    ['3', '1', '2']
  )
})

test('le poids départage deux correspondances du même niveau', t => {
  const lowWeight = createSearchDocument([{value: 'Canal', weight: 1}])
  const highWeight = createSearchDocument([{value: 'Canal', weight: 8}])

  t.true(scoreSearchDocument(highWeight, 'canal') > scoreSearchDocument(lowWeight, 'canal'))
})
