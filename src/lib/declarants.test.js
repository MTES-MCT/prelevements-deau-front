import test from 'ava'

import {
  PRELEVEUR_TYPE_LABELS,
  PRELEVEUR_TYPE_OPTIONS,
  canDisplayDeclarantExploitationSummary,
  getPreleveurType,
  getPreleveurTypeLabel,
  normalizePreleveurTypeForRole
} from './declarants.js'

test('les types de préleveur respectent le contrat de l’API et leur ordre d’affichage', t => {
  t.deepEqual(PRELEVEUR_TYPE_LABELS, {
    ICPE: 'ICPE',
    IRRIGANT: 'Irrigant',
    GESTIONNAIRE_AEP: 'Gestionnaire AEP',
    AUTRE: 'Autre'
  })
  t.deepEqual(PRELEVEUR_TYPE_OPTIONS, [
    {value: 'ICPE', label: 'ICPE'},
    {value: 'IRRIGANT', label: 'Irrigant'},
    {value: 'GESTIONNAIRE_AEP', label: 'Gestionnaire AEP'},
    {value: 'AUTRE', label: 'Autre'}
  ])
})

test('getPreleveurType lit les représentations directe et imbriquée du déclarant', t => {
  t.is(getPreleveurType({declarantRole: 'PRELEVEUR', preleveurType: 'ICPE'}), 'ICPE')
  t.is(getPreleveurType({declarant: {declarantRole: 'PRELEVEUR', preleveurType: 'IRRIGANT'}}), 'IRRIGANT')
  t.is(getPreleveurType({
    preleveurType: 'GESTIONNAIRE_AEP',
    declarant: {preleveurType: 'AUTRE'}
  }), 'GESTIONNAIRE_AEP')
})

test('getPreleveurType ne propose jamais de type pour un collecteur', t => {
  t.is(getPreleveurType({declarantRole: 'COLLECTEUR', preleveurType: 'AUTRE'}), null)
  t.is(getPreleveurType({declarant: {declarantRole: 'COLLECTEUR', preleveurType: 'ICPE'}}), null)
})

test('normalizePreleveurTypeForRole force la valeur null dans le payload collecteur', t => {
  t.is(normalizePreleveurTypeForRole('COLLECTEUR', 'IRRIGANT'), null)
  t.is(normalizePreleveurTypeForRole('PRELEVEUR', 'GESTIONNAIRE_AEP'), 'GESTIONNAIRE_AEP')
  t.is(normalizePreleveurTypeForRole('PRELEVEUR', ''), null)
})

test('un type absent ou inconnu ne devient pas implicitement Autre', t => {
  t.is(getPreleveurType({declarantRole: 'PRELEVEUR'}), null)
  t.is(getPreleveurTypeLabel(null), null)
  t.is(getPreleveurTypeLabel('INCONNU'), null)
  t.is(getPreleveurTypeLabel('AUTRE'), 'Autre')
})

test('les résumés d’exploitations suivent les droits de chaque déclarant', t => {
  t.true(canDisplayDeclarantExploitationSummary({
    right: {permissions: ['exploitation.list']}
  }))
  t.true(canDisplayDeclarantExploitationSummary({
    right: {isAdmin: true, permissions: []}
  }))
  t.false(canDisplayDeclarantExploitationSummary({
    right: {permissions: ['declarant.list']}
  }))
  t.false(canDisplayDeclarantExploitationSummary({}))
})

test('la liste collecteur est un périmètre relationnel fiable malgré READ_ONLY', t => {
  t.true(canDisplayDeclarantExploitationSummary(
    {right: {permissions: []}},
    {trustedCollectorScope: true}
  ))
})
