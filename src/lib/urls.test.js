import test from 'ava'

import {
  getDeclarantId,
  getDeclarantURL,
  getDeclarantsURL,
  getDeclarationURL,
  getDeclarationsURL,
  getMyDeclarationSubmissionSuccessURL,
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
  t.is(getMyDeclarationSubmissionSuccessURL({id: 'declaration-id'}), '/mes-declarations/declaration-id?submitted=1')
  t.is(getMyTelemetrySourceURL({id: 'source-id'}), '/mes-declarations/sources/source-id')
  t.is(getPointPrelevementURL({id: 'point-id'}), '/points-prelevement/point-id')
})

test('URL canonique du point : conserve les filtres répétés, vides et encodés', t => {
  t.is(getPointPrelevementURL({id: 'canonical-id'}, {searchParams: {
    zones: ['sage-1', 'sage-2'], period: '2026-09', usage: 'Irrigation & élevage', empty: '', absent: undefined
  }}), '/points-prelevement/canonical-id?zones=sage-1&zones=sage-2&period=2026-09&usage=Irrigation+%26+%C3%A9levage&empty=')
  t.is(getPointPrelevementURL({id: 'canonical-id'}, {edit: true}), '/points-prelevement/canonical-id/edit')
  t.is(getPointPrelevementURL({id: 'canonical-id'}, {edit: true, searchParams: {returnTo: '//external.example'}}),
    '/points-prelevement/canonical-id/edit?returnTo=%2F%2Fexternal.example')
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
