import test from 'ava'

import {
  canReadGlobalMeterReadings, formatMeterDate, formatMeterIndex, formatMeterPercentage,
  getMeterQualityLabel, getMeterSynchronizationStatus, mergeMeterReadings
} from './meter-synchronization.js'
import {serializeExploitationConnectors} from './exploitation-connectors.js'

test('une part absente ou incohérente ne devient jamais 100 %', t => {
  for (const value of [null, undefined, '', NaN, -1, 101]) {
    t.is(formatMeterPercentage(value), 'À valider')
  }

  t.is(formatMeterPercentage('70.125'), '70,125 %')
  t.is(formatMeterPercentage(0), '0 %')
})

test('les statuts distinguent affectation incomplète et synchronisation réussie', t => {
  t.deepEqual(getMeterSynchronizationStatus({status: 'ENDED', sync: {state: 'SUCCESS'}}), {status: 'Affectation terminée', severity: 'info'})
  t.regex(getMeterSynchronizationStatus({status: 'INCOMPLETE', sync: {state: 'SUCCESS'}}).note, /aucun volume attribué/)
  t.deepEqual(getMeterSynchronizationStatus({status: 'ACTIVE', sync: {state: 'ERROR'}}), {status: 'Dernière synchronisation en échec', severity: 'error'})
  t.deepEqual(getMeterSynchronizationStatus({status: 'ACTIVE', sync: {state: 'PENDING'}}), {status: 'En attente', severity: 'info'})
  t.deepEqual(getMeterSynchronizationStatus({status: 'ACTIVE', sync: {state: 'SUCCESS'}}), {status: 'Synchronisation active', severity: 'success'})
  t.deepEqual(getMeterSynchronizationStatus({status: 'DISABLED', sync: {state: 'SUCCESS'}}), {status: 'En pause', severity: 'info'})
  t.deepEqual(getMeterSynchronizationStatus({status: 'ACTIVE', sync: {state: 'DISABLED'}}), {status: 'En pause', severity: 'info'})
  t.deepEqual(getMeterSynchronizationStatus({status: 'INCOMPLETE', sync: {available: false}}), {status: 'Non connecté', note: 'Sans synchronisation automatique.'})
  t.is(getMeterQualityLabel('Y'), 'Y')
  t.is(getMeterQualityLabel('Vérifié manuellement'), 'Vérifié manuellement')
  t.is(getMeterQualityLabel(null), 'Qualité non renseignée')
})

test('la consultation globale exige ADMIN et la capacité explicite du serveur', t => {
  t.true(canReadGlobalMeterReadings({capabilities: {canReadGlobalReadings: true}}, true))
  t.false(canReadGlobalMeterReadings({capabilities: {canReadGlobalReadings: true}}, false))
  t.false(canReadGlobalMeterReadings({}, true))
  t.false(canReadGlobalMeterReadings({capabilities: {canReadGlobalReadings: false}}, true))
})

test('les dates restent exactes à la seconde, en heure de Paris', t => {
  t.is(formatMeterDate('2026-09-01T00:11:43Z', {withTime: true}), '01/09/2026 02:11:43')
  t.is(formatMeterDate('invalid'), 'Non renseignée')
  t.is(formatMeterDate(null), 'Non renseignée')
})

test('la pagination ne duplique pas les relevés à la borne', t => {
  t.deepEqual(mergeMeterReadings([{id: 'a', index: 1}], [{id: 'a', index: 2}, {id: 'b', index: 3}]), [{id: 'a', index: 2}, {id: 'b', index: 3}])
})

test('un index absent ne s’affiche pas comme un zéro réel', t => {
  t.is(formatMeterIndex(null), 'Non renseigné')
  t.is(formatMeterIndex(''), 'Non renseigné')
  t.is(formatMeterIndex('0'), '0')
})

test('le formulaire préserve les ids et paramètres des connecteurs existants', t => {
  t.deepEqual(serializeExploitationConnectors([{
    id: 'connector-stable', connectorType: 'orange_live_objects', rate: '70',
    connectorParametersText: '{"sourcePointId":"meter-existing"}'
  }]), [{id: 'connector-stable', connectorType: 'orange_live_objects', rate: 70, connectorParameters: {sourcePointId: 'meter-existing'}}])
  t.deepEqual(serializeExploitationConnectors([{connectorType: 'willie', rate: 100, connectorParametersText: ''}]), [{connectorType: 'willie', rate: 100, connectorParameters: {}}])
  t.throws(() => serializeExploitationConnectors([{connectorType: 'willie', connectorParametersText: '{bad'}]), {message: /JSON/})
})
