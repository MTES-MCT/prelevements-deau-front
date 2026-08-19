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

test('retrouve des mots séparés par un mot de liaison dans le libellé', t => {
  const ferme = createSearchDocument([{value: 'Ferme de Beauvert', weight: 8}])

  t.not(scoreSearchDocument(ferme, 'ferme beauvert'), null)
})

test('tolère une seule édition sur les mots humains alphabétiques dès quatre lettres', t => {
  const ferme = createSearchDocument([{value: 'Ferme de Beauvert', weight: 8}])

  for (const query of ['ferne', 'ferm', 'fermee', 'femre', 'ferne beauvert']) {
    t.not(scoreSearchDocument(ferme, query), null, `requête ${query}`)
  }
})

test('refuse les doubles fautes et l’approximation des mots courts', t => {
  const ferme = createSearchDocument([{value: 'Ferme de Beauvert', weight: 8}])

  t.is(scoreSearchDocument(ferme, 'farni'), null)
  t.is(scoreSearchDocument(ferme, 'fem'), null)
  t.is(scoreSearchDocument(document, 'asb'), null)
  t.is(scoreSearchDocument(document, 'asaa'), null)
})

test('ne corrige jamais approximativement les identifiants et codes techniques', t => {
  const identifiers = createSearchDocument([
    {value: '10972X0137/PONT', identifier: true},
    {value: '12345678900012', identifier: true},
    {value: 'contact@example.fr', identifier: true},
    {value: '0612345678', identifier: true},
    {value: 'ABCD', identifier: true}
  ])
  const technicalTerms = createSearchDocument([
    {value: 'SIRET BSS BNPE AIOT BDLISA PTP UUID'}
  ])

  for (const query of [
    '10972X0138/PONT',
    '12345678900013',
    'contact@examplf.fr',
    '0612345679',
    'ABCE'
  ]) {
    t.is(scoreSearchDocument(identifiers, query), null, `requête ${query}`)
  }

  for (const query of ['sirex', 'bsa', 'bnpa', 'aiop', 'bdliza', 'ptq', 'uvid']) {
    t.is(scoreSearchDocument(technicalTerms, query), null, `requête ${query}`)
  }
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
