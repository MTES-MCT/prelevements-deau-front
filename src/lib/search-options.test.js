import test from 'ava'

import {
  filterSearchAutocompleteOptions,
  getIdentifierAwareSearchQueries,
  getSearchableOptionText,
  matchesSearchTerms
} from './search-options.js'

test('les requêtes sur un identifiant acceptent les séparateurs', t => {
  t.deepEqual(getIdentifierAwareSearchQueries('123 456 789 00012'), [
    '123 456 789 00012',
    '12345678900012'
  ])
  t.deepEqual(getIdentifierAwareSearchQueries('Forage Étang'), ['forage etang'])
})

test('le texte de recherche inclut les BSS et SIRET sans modifier le libellé', t => {
  const pointOption = {
    label: 'Forage communal',
    point: {codeBSS: '10972X0137/PONT'}
  }
  const declarantOption = {
    label: 'ASA des Albères',
    declarant: {siret: '12345678900012'}
  }

  t.true(getSearchableOptionText(pointOption).includes('10972x0137/pont'))
  t.true(getSearchableOptionText(declarantOption).includes('12345678900012'))
  t.deepEqual(filterSearchAutocompleteOptions([pointOption], {inputValue: '10972x0137'}), [pointOption])
  t.deepEqual(filterSearchAutocompleteOptions([declarantOption], {inputValue: '123 456 789 00012'}), [declarantOption])
})

test('la limite est appliquée après le filtrage', t => {
  const options = [
    {label: 'Premier forage', codeBSS: 'BSS001'},
    {label: 'Deuxième forage', codeBSS: 'BSS002'}
  ]

  t.deepEqual(filterSearchAutocompleteOptions(options, {inputValue: 'bss'}, {limit: 1}), [options[0]])
})

test('la recherche textuelle exige tous les termes sans imposer une phrase contiguë', t => {
  const beauvert = {label: 'Ferme de Beauvert'}
  const autreFerme = {label: 'Ferme des Alouettes'}

  t.true(matchesSearchTerms('Ferme de Beauvert', 'ferme beauvert'))
  t.true(matchesSearchTerms('Préleveur Beauvert · Ferme communale', 'ferme beauvert'))
  t.false(matchesSearchTerms('Ferme des Alouettes', 'ferme beauvert'))
  t.deepEqual(
    filterSearchAutocompleteOptions([beauvert, autreFerme], {inputValue: 'ferme beauvert'}),
    [beauvert]
  )
})

test('la recherche par termes conserve le support des identifiants compacts', t => {
  t.true(matchesSearchTerms('SIRET 12345678900012', '123 456 789 00012'))
  t.true(matchesSearchTerms('Point 10972X0137/PONT', '10972X 0137 PONT'))
  t.true(matchesSearchTerms('Ferme de Beauvert · SIRET 12345678900012', 'ferme 123 456'))
  t.false(matchesSearchTerms('SIRET 12345678900012', '789 123'))
  t.false(matchesSearchTerms('Ferme de Beauvert · SIRET 12345678900012', 'ferme 789 123'))
  t.false(matchesSearchTerms('SIRET 12345678900012', '123 555 000 00012'))
})

test('la recherche aligne les ligatures avec leur saisie développée', t => {
  t.true(matchesSearchTerms('Pompage au cœur du marais', 'coeur marais'))
  t.true(matchesSearchTerms('Exploitation CÆSAR', 'caesar'))
})
