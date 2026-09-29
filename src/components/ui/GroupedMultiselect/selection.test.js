import test from 'ava'

import {areSameSelections, updateVisibleSelection} from './selection.js'

test('la comparaison ne recharge pas pour un simple changement d’ordre', t => {
  t.true(areSameSelections(['a', 'b'], ['b', 'a']))
  t.true(areSameSelections([], []))
  t.true(areSameSelections(['a', 'a'], ['a']))
  t.false(areSameSelections(['a'], ['b']))
  t.false(areSameSelections(['a'], []))
})

test('sélectionner les résultats conserve les autres valeurs et ne crée aucun doublon', t => {
  const current = ['hidden', 'disabled', 'a']
  t.deepEqual(updateVisibleSelection(current, ['a', 'b', 'b'], true), ['hidden', 'disabled', 'a', 'b'])
  t.deepEqual(current, ['hidden', 'disabled', 'a'])
})

test('désélectionner les résultats conserve les choix hors recherche et désactivés', t => {
  t.deepEqual(updateVisibleSelection(['hidden', 'disabled', 'a', 'b'], ['a', 'b'], false), ['hidden', 'disabled'])
  t.deepEqual(updateVisibleSelection(['a'], [], false), ['a'])
  t.deepEqual(updateVisibleSelection(['a', 'b'], ['a', 'b'], false), [])
})

test('la sélection groupée supporte un grand nombre de zones', t => {
  const zones = Array.from({length: 2000}, (_, index) => `zone-${index}`)
  const selected = updateVisibleSelection([], zones, true)
  t.true(areSameSelections(selected, zones))
  t.deepEqual(updateVisibleSelection(selected, zones, false), [])
})
