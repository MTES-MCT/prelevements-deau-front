import test from 'ava'

import {
  campaignHasUnreferencedMeter, campaignIndexEntryFilled, campaignTargetIndexEntries, campaignTargetMeterEvents
} from './campaign-response-readings.js'
import {readingKey} from './collection-campaigns.js'

const indexDates = ['2026-01-01', '2026-06-01', '2027-01-01']
const target = {id: 'point', meters: [{compteurId: 'old'}, {compteurId: 'new'}]}
const replacement = {
  targetId: 'point', type: 'REPLACEMENT', at: '2026-06-01', previousCompteurId: 'old', nextCompteurId: 'new', previousIndex: '500', nextIndex: '0', reason: 'Compteur remplacé'
}
const entries = (options = {}) => campaignTargetIndexEntries({
  target, indexDates, readings: new Map(), events: [replacement], ...options
})

test('un remplacement coupe les affectations : ancien avant, nouveau après et les deux à la transition', t => {
  t.deepEqual(entries().map(entry => [entry.date, entry.meter.compteurId]), [
    ['2026-01-01', 'old'], ['2026-06-01', 'old'], ['2026-06-01', 'new'], ['2027-01-01', 'new']
  ])
  const transition = entries().filter(entry => entry.date === replacement.at)
  t.deepEqual(transition.map(entry => entry.eventReadings), [
    [{side: 'previous', value: '500', missingReason: replacement.reason}], [{side: 'next', value: '0', missingReason: replacement.reason}]
  ])
  t.true(transition.every(entry => campaignIndexEntryFilled(entry)))
})

test('une remise à zéro conserve le même compteur et reprend ses deux index à la date demandée', t => {
  const reset = {
    ...replacement, type: 'RESET', nextCompteurId: 'old', nextIndex: '2'
  }
  const result = entries({target: {id: 'point', meters: [{compteurId: 'old'}]}, events: [reset]})
  t.is(result.length, 3)
  t.true(result.every(entry => entry.meter.compteurId === 'old'))
  t.deepEqual(result[1].eventReadings.map(reading => [reading.side, reading.value]), [['previous', '500'], ['next', '2']])
  t.true(campaignIndexEntryFilled(result[1]))
  t.false(campaignIndexEntryFilled(result[0]))
})

test('le compteur virtuel est relié à son événement sans modifier les identifiants du brouillon', t => {
  const {nextCompteurId, ...event} = replacement
  event.nextMeter = {serialNumber: 'Nouveau'}
  const scopedTarget = {
    id: 'point', meters: [{compteurId: 'old'}, {
      compteurId: 'virtual', pending: true, pendingEvent: {previousCompteurId: 'old', at: replacement.at}, startDate: replacement.at
    }]
  }
  const before = structuredClone({event, scopedTarget})
  const result = entries({target: scopedTarget, events: [event]})
  t.is(result.at(-1).meter.compteurId, 'virtual')
  t.is(result[2].eventReadings[0].value, '0')
  t.deepEqual({event, scopedTarget}, before)
  t.false(Object.hasOwn(event, 'nextCompteurId'))
})

test('annuler le remplacement réaffiche les relevés existants de l’ancien et masque le compteur virtuel orphelin', t => {
  const reading = {
    targetId: 'point', compteurId: 'old', readingDate: '2027-01-01', value: '700'
  }
  const readings = new Map([[readingKey(reading), reading]])
  const scopedTarget = {id: 'point', meters: [{compteurId: 'old'}, {compteurId: 'virtual', pending: true, pendingEvent: {previousCompteurId: 'old', at: replacement.at}}]}
  const {nextCompteurId, ...event} = replacement
  event.nextMeter = {identifier: 'Nouveau'}
  const replaced = entries({target: scopedTarget, readings, events: [event]})
  t.false(replaced.some(entry => entry.value === reading))
  const cancelled = entries({target: scopedTarget, readings, events: []})
  t.true(cancelled.every(entry => entry.meter.compteurId === 'old'))
  t.is(cancelled.at(-1).value, reading)
  t.is(readings.get(readingKey(reading)), reading)
})

test('un nouvel inventaire en cours d’enregistrement ne crée ni identifiant ni index fictif', t => {
  const {nextCompteurId, ...event} = replacement
  event.nextMeter = {identifier: 'Nouveau'}
  const result = entries({target: {id: 'point', meters: [{compteurId: 'old'}]}, events: [event]})
  t.true(result.at(-1).awaitingMeter)
  t.is(result.at(-1).meter.compteurId, undefined)
  t.false(campaignIndexEntryFilled(result.at(-1)))
  t.true(campaignIndexEntryFilled(result[2]))
  t.falsy(result.at(-1).unavailable)
})

test('les événements sont indexés par point et ne modifient jamais un compteur d’un autre périmètre', t => {
  const foreign = {...replacement, targetId: 'foreign'}
  const byTarget = campaignTargetMeterEvents([replacement, foreign])
  t.deepEqual(byTarget.get('point'), [replacement])
  t.deepEqual(byTarget.get('foreign'), [foreign])
  const result = entries({events: [foreign]})
  t.is(result.length, 6)
  t.true(result.every(entry => !entry.eventReadings))
})

test('les dates d’affectation restent contraignantes et toutes les dates attendues restent visibles', t => {
  const scopedTarget = {id: 'point', meters: [{compteurId: 'old', startDate: '2026-02-01', endDate: '2026-05-01'}, {compteurId: 'new', startDate: '2026-07-01'}]}
  const result = entries({target: scopedTarget})
  t.deepEqual(result.map(entry => entry.date), indexDates)
  t.true(result[0].unavailable)
  t.true(result[1].unavailable)
  t.is(result[2].meter.compteurId, 'new')
})

test('un index inconnu justifié compte comme réponse, sans devenir zéro ni reprendre un index concurrent', t => {
  const reading = {
    targetId: 'point', compteurId: 'old', readingDate: replacement.at, value: '999'
  }
  const result = entries({readings: new Map([[readingKey(reading), reading]]), events: [{...replacement, previousIndex: null, reason: 'Cadran cassé'}]})
  t.is(result[1].value, reading)
  t.is(result[1].eventReadings[0].value, null)
  t.true(campaignIndexEntryFilled(result[1]))
  t.false(campaignIndexEntryFilled({eventReadings: [{value: null, missingReason: ' '}]}))
  t.false(campaignIndexEntryFilled({eventReadings: [{value: '', missingReason: 'Motif'}]}))
  t.true(campaignIndexEntryFilled({eventReadings: [{value: '0'}]}))
})

test('sans inventaire une remise à zéro conserve la ligne null et les index avant et après', t => {
  const reset = {
    ...replacement, type: 'RESET', previousCompteurId: null, nextCompteurId: null
  }
  const result = entries({target: {id: 'point', meters: []}, events: [reset]})
  t.is(result.length, 3)
  t.true(result.every(entry => entry.meter.compteurId === null))
  t.deepEqual(result[1].eventReadings.map(reading => [reading.side, reading.value]), [['previous', '500'], ['next', '0']])
})

test('un remplacement sans inventaire garde le segment initial pendant et après l’enregistrement', t => {
  const {nextCompteurId, ...event} = {...replacement, previousCompteurId: null}
  event.nextMeter = {serialNumber: 'Nouveau'}
  const pending = {
    compteurId: 'virtual', pending: true, pendingEvent: {previousCompteurId: null, at: replacement.at}, startDate: replacement.at
  }
  const stages = [
    {id: 'point', meters: []},
    {
      id: 'point', meterlessInitial: true, meterlessEndDate: null, meters: [pending]
    },
    {
      id: 'point', meterlessInitial: true, meterlessEndDate: replacement.at, meters: [{compteurId: 'virtual', startDate: replacement.at}]
    }
  ]
  const readings = new Map()
  const initial = {
    targetId: 'point', compteurId: null, readingDate: indexDates[0], value: '100', meterConfirmed: true
  }
  readings.set(readingKey(initial), initial)
  for (const [index, scopedTarget] of stages.entries()) {
    const result = entries({target: scopedTarget, events: [index === 2 ? {...replacement, previousCompteurId: null, nextCompteurId: 'virtual'} : event], readings})
    t.is(result[0].meter.compteurId, null)
    t.is(result[0].value, initial)
    t.is(result[1].meter.compteurId, null)
    t.is(result[1].eventReadings[0].value, '500')
    t.not(result.at(-1).meter.compteurId, null)
    t.is(result.at(-1).awaitingMeter, index === 0 ? true : undefined)
  }
})

test('retirer un remplacement sans inventaire restaure les dates null et ignore le compteur virtuel orphelin', t => {
  const scopedTarget = {
    id: 'point', meterlessInitial: true, meterlessEndDate: null, meters: [{compteurId: 'virtual', pending: true, pendingEvent: {previousCompteurId: null, at: replacement.at}}]
  }
  const result = entries({target: scopedTarget, events: []})
  t.is(result.length, 3)
  t.true(result.every(entry => entry.meter.compteurId === null))
  t.true(result.every(entry => !entry.awaitingMeter && !entry.eventReadings))
})

test('les indicateurs du serveur bornent le compteur initial sans en créer sur les autres points', t => {
  t.true(campaignHasUnreferencedMeter({meters: []}))
  t.false(campaignHasUnreferencedMeter({meters: [], meterlessInitial: false}))
  t.false(campaignHasUnreferencedMeter(target))
  const scopedTarget = {
    id: 'point', meterlessInitial: true, meterlessEndDate: '2026-06-01', meters: [{compteurId: 'new', startDate: '2026-06-01'}]
  }
  t.deepEqual(entries({target: scopedTarget, events: []}).map(entry => entry.meter.compteurId), [null, null, 'new', 'new'])
  t.false(entries({events: [{...replacement, previousCompteurId: null}]}).some(entry => entry.meter.compteurId === null))
})
