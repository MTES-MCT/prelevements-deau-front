import test from 'ava'
import {buildCollectorPointEditionPayload, collectorExploitationLabel} from './collector-point-edition.js'

const fixture = () => ({
  point: {id: 'point', updatedAt: 'point-version', waterAgencyInternalIdentifier: '0001', waterBodyIdentifier: 'RET-001',
    right: {editableFields: ['waterAgencyInternalIdentifier', 'waterBodyIdentifier', 'reservoirNominalVolume', 'nature']}},
  exploitations: [
    {id: 'first', countingCode: '001', capabilities: {canEditCountingCode: true, canAddMeter: true},
      meters: [{id: 'manual', serialNumber: 'M-001', updatedAt: 'meter-version', capabilities: {canEditSerialNumber: true}},
        {id: 'shared', serialNumber: 'S-001', updatedAt: 'shared-version', capabilities: {canEditSerialNumber: false}}]},
    {id: 'second', countingCode: '002', capabilities: {canEditCountingCode: false, canAddMeter: false}, meters: []}
  ]
})

test('sans changement ni numéro nouveau, aucun objet métier ne figure dans les changements', t => {
  const initial = fixture()
  const exploitations = structuredClone(initial.exploitations)
  exploitations[0].meters.push({draftId: 'draft', serialNumber: '   '})
  t.deepEqual(buildCollectorPointEditionPayload(initial, {exploitations}), {expectedUpdatedAt: 'point-version', point: {}, exploitations: []})
})

test('les changements restent dans leur exploitation avec versions et zéros initiaux', t => {
  const initial = fixture()
  const exploitations = structuredClone(initial.exploitations)
  exploitations[0].countingCode = ' 00012 '
  exploitations[0].meters[0].serialNumber = ' 000M-2 '
  exploitations[0].meters.push({draftId: 'draft', serialNumber: ' 000NEW '})
  const result = buildCollectorPointEditionPayload(initial, {pointPatch: {waterAgencyInternalIdentifier: ' 0002 '}, exploitations})
  t.deepEqual(result, {expectedUpdatedAt: 'point-version', point: {waterAgencyInternalIdentifier: '0002'}, exploitations: [{
    id: 'first', countingCode: '00012', expectedCountingCode: '001', meters: [
      {id: 'manual', expectedUpdatedAt: 'meter-version', serialNumber: '000M-2'}, {serialNumber: '000NEW'}
    ]
  }]})
})

test('effacer un numéro existant envoie null, jamais une suppression du compteur', t => {
  const initial = fixture()
  const exploitations = structuredClone(initial.exploitations)
  exploitations[0].countingCode = ''
  exploitations[0].meters[0].serialNumber = ' '
  t.deepEqual(buildCollectorPointEditionPayload(initial, {pointPatch: {waterBodyIdentifier: ''}, exploitations}), {
    expectedUpdatedAt: 'point-version', point: {waterBodyIdentifier: null}, exploitations: [{id: 'first', countingCode: null,
      expectedCountingCode: '001', meters: [{id: 'manual', expectedUpdatedAt: 'meter-version', serialNumber: null}]}]
  })
})

test('les champs et compteurs protégés, identités inconnues et ajouts non autorisés ne sont pas transmis', t => {
  const initial = fixture()
  const exploitations = structuredClone(initial.exploitations)
  exploitations[0].meters[1].serialNumber = 'Interdit'
  exploitations[0].meters.push({id: 'unknown', serialNumber: 'Interdit'})
  exploitations[1].countingCode = 'Interdit'
  exploitations[1].meters.push({serialNumber: 'Interdit'})
  exploitations.push({id: 'unknown', countingCode: 'Interdit'})
  t.deepEqual(buildCollectorPointEditionPayload(initial, {pointPatch: {internalComment: 'Interdit', sourceId: 'Interdit'}, exploitations}), {
    expectedUpdatedAt: 'point-version', point: {}, exploitations: []
  })
})

test('chaque section identifie explicitement son préleveur et son usage', t => {
  t.is(collectorExploitationLabel({preleveur: {socialReason: 'Structure synthétique'}, usage: {label: 'Irrigation'}}, 1), 'Exploitation 2 — Structure synthétique — Irrigation')
  t.is(collectorExploitationLabel({preleveur: {firstName: 'Camille', lastName: 'Test'}}, 0), 'Exploitation 1 — Camille Test')
})
