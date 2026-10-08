import test from 'ava'

import {buildCollectorPointCreationPayload, findSimilarAccessiblePoints} from './collector-point-creation.js'

const input = () => ({
  requestId: 'request',
  mode: 'new',
  preleveurId: 'existing',
  preleveur: {declarantType: 'NATURAL_PERSON', firstName: 'Test', lastName: 'Synthétique', preleveurType: 'AUTRE', email: ''},
  point: {name: 'Point synthétique', flowType: 'PRELEVEMENT', waterBodyType: 'SOUTERRAIN'},
  exploitation: {usageId: 'usage', secondaryUsageIds: [], status: 'EN_ACTIVITE', startDate: '', endDate: ''}
})

test('la création collecteur ne transmet que les champs autorisés et conserve les booléens faux', t => {
  const value = input()
  Object.assign(value.point, {internalComment: 'Interdit', pointKind: 'FICTIF', sourceId: 'source', isWaterBodyConnectedToStream: false, communeCode: null, communeName: null})
  Object.assign(value.preleveur, {declarantRole: 'COLLECTEUR', role: 'ADMIN', sourceId: 'source', quickDeclarationEnabled: true, socialReason: 'Ancienne valeur', siret: '12345678900012'})
  Object.assign(value.exploitation, {collecteurUserIds: ['other'], pointPrelevementId: 'other', declarantUserId: 'other', connectors: [{connectorType: 'private'}]})
  const result = buildCollectorPointCreationPayload(value)
  t.false(Object.hasOwn(result, 'preleveurId'))
  t.false(result.point.isWaterBodyConnectedToStream)
  for (const field of ['internalComment', 'pointKind', 'sourceId', 'communeCode', 'communeName']) t.false(Object.hasOwn(result.point, field))
  for (const field of ['declarantRole', 'role', 'sourceId', 'quickDeclarationEnabled', 'socialReason', 'siret']) t.false(Object.hasOwn(result.preleveur, field))
  t.deepEqual(result.exploitation, {usageId: 'usage', secondaryUsageIds: [], status: 'EN_ACTIVITE'})
})

test('invitation seulement sur choix explicite, nouveau compte et email non vide', t => {
  const value = input()
  t.false(buildCollectorPointCreationPayload(value).notifyAccountCreation)
  value.notifyAccountCreation = true
  t.false(buildCollectorPointCreationPayload(value).notifyAccountCreation)
  value.preleveur.email = 'test@example.org'
  t.true(buildCollectorPointCreationPayload(value).notifyAccountCreation)
  value.mode = 'existing'
  const existing = buildCollectorPointCreationPayload(value)
  t.false(existing.notifyAccountCreation)
  t.is(existing.preleveurId, 'existing')
  t.false(Object.hasOwn(existing, 'preleveur'))
})

test('personne morale conserve le SIRET et l’identifiant de demande reste stable', t => {
  const value = input()
  Object.assign(value.preleveur, {declarantType: 'LEGAL_PERSON', socialReason: ' Structure synthétique ', siret: '12345678900012'})
  const result = buildCollectorPointCreationPayload(value)
  t.is(result.preleveur.socialReason, 'Structure synthétique')
  t.is(result.preleveur.siret, '12345678900012')
  t.is(result.requestId, value.requestId)
})

test('avertissement homonymes utilise seulement les points fournis sans recherche globale', t => {
  const points = [{id: 'same', name: 'POINT SYNTHETIQUE'}, {id: 'usage', name: 'ABC', usageName: 'point synthétique'}, {id: 'other', name: 'Autre point'}]
  t.deepEqual(findSimilarAccessiblePoints({name: 'Point synthétique'}, points).map(point => point.id), ['same', 'usage'])
  t.deepEqual(findSimilarAccessiblePoints({name: 'ab'}, [{id: 'short', name: 'ab'}]), [])
  t.deepEqual(findSimilarAccessiblePoints({name: 'Autre point'}), [])
})
