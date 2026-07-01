import test from 'ava'

import {
  getDeclarantId,
  getDeclarantURL,
  getDeclarantsURL,
  getDeclarationURL,
  getDeclarationsURL,
  getMyDeclarationURL,
  getMyDeclarationsURL,
  getMyTelemetrySourceURL,
  getNewExploitationURL,
  getPointPrelevementURL,
  getPointsPrelevementURL,
  getPreleveurURL,
  getPreleveursURL
} from './urls.js'

test('URLs de listes principales', t => {
  t.is(getDeclarationsURL(), '/declarations')
  t.is(getDeclarantsURL(), '/declarants')
  t.is(getPreleveursURL(), '/preleveurs')
  t.is(getPointsPrelevementURL(), '/points-prelevement')
  t.is(getMyDeclarationsURL(), '/mes-declarations')
})

test('URLs de détail', t => {
  t.is(getDeclarationURL('declaration-id'), '/declarations/declaration-id')
  t.is(getMyDeclarationURL({id: 'declaration-id'}), '/mes-declarations/declaration-id')
  t.is(getMyTelemetrySourceURL({id: 'source-id'}), '/mes-declarations/sources/source-id')
  t.is(getPointPrelevementURL({id: 'point-id'}), '/points-prelevement/point-id')
})

test('getDeclarantId accepte les formes API courantes', t => {
  t.is(getDeclarantId({userId: 'user-id'}), 'user-id')
  t.is(getDeclarantId({id: 'declarant-id'}), 'declarant-id')
  t.is(getDeclarantId({user: {id: 'nested-user-id'}}), 'nested-user-id')
  t.is(getDeclarantId(null), undefined)
})

test('URLs déclarant et préleveur utilisent l’identifiant résolu', t => {
  t.is(getDeclarantURL({userId: 'user-id'}), '/declarants/user-id')
  t.is(getPreleveurURL({user: {id: 'nested-user-id'}}), '/preleveurs/nested-user-id')
})

test('getNewExploitationURL encode les paramètres optionnels', t => {
  t.is(getNewExploitationURL(), '/exploitations/new')
  t.is(
    getNewExploitationURL({pointId: 'point id', usage: '2A'}),
    '/exploitations/new?pointId=point+id&usage=2A'
  )
})
