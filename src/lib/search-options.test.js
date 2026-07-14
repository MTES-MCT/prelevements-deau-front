import test from 'ava'

import {
  filterSearchAutocompleteOptions,
  getIdentifierAwareSearchQueries,
  getSearchableOptionText
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
