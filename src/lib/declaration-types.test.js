import test from 'ava'

import {getDeclarationTypeLabel} from './declaration-types.js'

test('getDeclarationTypeLabel privilégie le nom fourni par l’API', t => {
  t.is(
    getDeclarationTypeLabel('gidaf', {name: 'Déclaration personnalisée'}),
    'Déclaration personnalisée'
  )
})

test('getDeclarationTypeLabel normalise les codes connus', t => {
  t.is(getDeclarationTypeLabel(' GIDAF '), 'Extraction Gidaf')
  t.is(getDeclarationTypeLabel('QUICK-DECLARATION'), 'Saisie rapide')
  t.is(getDeclarationTypeLabel('template-file'), 'Modèle de déclaration de volumes')
})

test('getDeclarationTypeLabel retourne le code inconnu normalisé ou Autre', t => {
  t.is(getDeclarationTypeLabel(' Nouveau-Type '), 'nouveau-type')
  t.is(getDeclarationTypeLabel(null), 'Autre')
  t.is(getDeclarationTypeLabel(undefined), 'Autre')
})
