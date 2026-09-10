import test from 'ava'

import {campaignMeterEventIssues, validateCampaignMeterEvent} from './campaign-meter-event-validation.js'

const meter = (compteurId, extra = {}) => ({compteurId, ...extra})
const target = {id: 'point-a', meters: [meter('meter-a'), meter('meter-b'), meter('meter-c')]}
const context = {campaign: {indexDates: ['2026-01-01', '2026-04-01', '2026-07-01']}, targets: [target]}
const event = (extra = {}) => ({
  targetId: target.id, type: 'REPLACEMENT', at: '2026-03-01', previousCompteurId: 'meter-a', nextCompteurId: 'meter-b',
  previousIndex: '120', nextIndex: '0', reason: 'Compteur défectueux', ...extra
})
const reset = (extra = {}) => event({type: 'RESET', nextCompteurId: 'meter-a', ...extra})
const pendingEvent = (extra = {}) => {
  const {nextCompteurId, ...candidate} = event({previousCompteurId: null, ...extra})
  return {...candidate, nextMeter: {serialNumber: 'SN-NEUF'}}
}

const validate = (candidate, options = {}) => validateCampaignMeterEvent({
  event: candidate, context, target, draft: {}, ...options
})

test('les formats stockés de remplacement et remise à zéro sont valides sans autre relevé rempli', t => {
  for (const candidate of [event(), reset(), reset({nextCompteurId: undefined}), event({previousIndex: null, nextIndex: null})]) {
    t.deepEqual(validate(candidate), {fieldErrors: {}, messages: []})
  }

  t.deepEqual(validate(event(), {draft: {readings: [{targetId: target.id, value: ''}]}}).messages, [])
})

test('la validation ne dépend pas des droits d’écriture ni de l’heure pour afficher une carte en lecture seule', t => {
  t.deepEqual(validate(event(), {context: {...context, permissions: {canEdit: false}}}).messages, [])
})

test('le compteur non identifié et un nouveau compteur pending ne créent aucune identité fictive', t => {
  const anonymous = {
    ...target, meters: [], meterlessInitial: true, meterlessEndDate: null
  }
  t.deepEqual(validate(pendingEvent(), {target: anonymous}).messages, [])
  t.deepEqual(validate(reset({previousCompteurId: null, nextCompteurId: null}), {target: anonymous}).messages, [])
  t.truthy(validate(reset({previousCompteurId: null, nextCompteurId: null})).fieldErrors.previousCompteurId)
})

test('les champs obligatoires, décimaux et longueurs restent alignés sur le formulaire', t => {
  const result = validate(event({
    type: '', previousIndex: '', nextIndex: '-1', reason: '  '
  }))
  t.deepEqual(Object.keys(result.fieldErrors).sort(), ['nextIndex', 'previousIndex', 'reason', 'type'])
  for (const value of ['1e3', '1.00001', '12345678901234567']) {
    t.truthy(validate(event({previousIndex: value})).fieldErrors.previousIndex)
  }

  t.deepEqual(validate(event({previousIndex: '9999999999999999.9999', nextIndex: '0.0001'})).messages, [])
  t.truthy(validate(event({reason: 'a'.repeat(2001)})).fieldErrors.reason)
})

test('une nouvelle identification utilise les champs serialNumber et identifier de l’éditeur', t => {
  const anonymous = {...target, meters: []}
  t.truthy(validate({...pendingEvent(), nextMeter: {}}, {target: anonymous}).fieldErrors.serialNumber)
  t.truthy(validate({...pendingEvent(), nextMeter: {identifier: 'x'.repeat(201)}}, {target: anonymous}).fieldErrors.identifier)
  t.deepEqual(validate({...pendingEvent(), nextMeter: {identifier: 'Repère uniquement'}}, {target: anonymous}).messages, [])
  t.truthy(validate({...event(), nextMeter: {serialNumber: 'SN'}}).fieldErrors.nextCompteurId)
})

test('les identités étrangères et les remplacements vers le même compteur sont refusés', t => {
  t.truthy(validate(event({targetId: 'point-b'})).fieldErrors.targetId)
  t.truthy(validate(event({previousCompteurId: 'foreign'})).fieldErrors.previousCompteurId)
  t.truthy(validate(event({nextCompteurId: 'foreign'})).fieldErrors.nextCompteurId)
  t.truthy(validate(event({nextCompteurId: 'meter-a'})).fieldErrors.nextCompteurId)
  t.truthy(validate(reset({nextCompteurId: 'meter-b'})).fieldErrors.nextCompteurId)
})

test('les dates impossibles ou hors campagne sont immédiatement signalées', t => {
  for (const at of ['', '2026-02-30', 'pas une date', '2025-12-31', '2026-07-02']) {
    t.truthy(validate(event({at})).fieldErrors.at)
  }

  for (const at of ['2026-01-01', '2026-07-01']) {
    t.falsy(validate(event({at})).fieldErrors.at)
  }
})

test('les affectations de l’ancien et du nouveau compteur sont contrôlées avec des bornes inclusives', t => {
  const dated = {...target, meters: [meter('meter-a', {startDate: '2026-02-01T00:00:00.000Z', endDate: '2026-05-01'}), meter('meter-b', {startDate: '2026-03-01', endDate: '2026-06-01'})]}
  t.truthy(validate(event({at: '2026-01-15'}), {target: dated}).fieldErrors.at)
  t.truthy(validate(event({at: '2026-02-15'}), {target: dated}).fieldErrors.at)
  t.truthy(validate(event({at: '2026-05-15'}), {target: dated}).fieldErrors.at)
  t.falsy(validate(event({at: '2026-03-01'}), {target: dated}).fieldErrors.at)
  t.falsy(validate(event({at: '2026-05-01'}), {target: dated}).fieldErrors.at)
})

test('plusieurs affectations du même compteur permettent toute période de service autorisée', t => {
  const dated = {...target, meters: [meter('meter-a', {endDate: '2026-02-01'}), meter('meter-a', {startDate: '2026-03-01'}), meter('meter-b')]}
  t.deepEqual(validate(event({at: '2026-04-01'}), {target: dated}).messages, [])
  t.truthy(validate(event({at: '2026-02-15'}), {target: dated}).fieldErrors.at)
})

test('la phase initiale sans inventaire finit à la date autoritaire du premier compteur', t => {
  const anonymous = {...target, meterlessInitial: true, meterlessEndDate: '2026-03-01'}
  t.falsy(validate(pendingEvent(), {target: anonymous}).fieldErrors.at)
  t.truthy(validate(pendingEvent({at: '2026-03-02'}), {target: anonymous}).fieldErrors.at)
})

test('une carte est exclue une seule fois pour elle-même mais les doublons restent signalés', t => {
  const candidate = event()
  t.deepEqual(validate(candidate, {draft: {meterEvents: [candidate]}}).messages, [])
  t.deepEqual(validate({...candidate}, {draft: {meterEvents: [candidate]}, originalEvent: candidate}).messages, [])
  t.truthy(validate(candidate, {draft: {meterEvents: [candidate, {...candidate}]}, originalEvent: candidate}).fieldErrors.at)
  t.truthy(validate({...candidate}, {draft: {meterEvents: [candidate]}}).fieldErrors.at)
})

test('deux changements indépendants peuvent avoir la même date', t => {
  const other = reset({previousCompteurId: 'meter-c', nextCompteurId: 'meter-c'})
  t.deepEqual(validate(event(), {draft: {meterEvents: [other]}}).messages, [])
  t.deepEqual(validate(event(), {draft: {meterEvents: [event({targetId: 'point-b'})]}}).messages, [])
})

test('une remise à zéro ne peut pas suivre ni coïncider avec la sortie du compteur', t => {
  const draft = {meterEvents: [event()]}
  t.falsy(validate(reset({at: '2026-02-01'}), {draft}).fieldErrors.at)
  t.truthy(validate(reset({at: '2026-03-01'}), {draft}).fieldErrors.at)
  t.truthy(validate(reset({at: '2026-04-01'}), {draft}).fieldErrors.at)
  t.truthy(validate(event(), {draft: {meterEvents: [reset({at: '2026-04-01'})]}}).fieldErrors.at)
})

test('un compteur ne peut entrer ou sortir plusieurs fois pendant la campagne', t => {
  t.truthy(validate(event({at: '2026-04-01'}), {draft: {meterEvents: [event()]}}).fieldErrors.previousCompteurId)
  t.truthy(validate(event({previousCompteurId: 'meter-c', at: '2026-04-01'}), {draft: {meterEvents: [event()]}}).fieldErrors.nextCompteurId)
})

test('les changements dépendants doivent être postérieurs à l’entrée du compteur même si la liste est inversée', t => {
  const incoming = event()
  const before = reset({previousCompteurId: 'meter-b', nextCompteurId: 'meter-b', at: '2026-02-01'})
  t.truthy(validate(before, {draft: {meterEvents: [incoming]}}).fieldErrors.at)
  t.truthy(validate({...before, at: incoming.at}, {draft: {meterEvents: [incoming]}}).fieldErrors.at)
  t.falsy(validate({...before, at: '2026-04-01'}, {draft: {meterEvents: [incoming]}}).fieldErrors.at)
  t.truthy(validate(incoming, {draft: {meterEvents: [before]}}).fieldErrors.at)
})

test('déplacer un remplacement pending tient compte de la chaîne qui utilise son ancien UUID virtuel', t => {
  const original = pendingEvent()
  const pendingTarget = {...target, meterlessInitial: true, meters: [meter('virtual', {pending: true, pendingEvent: {at: original.at, previousCompteurId: null}})]}
  const next = reset({previousCompteurId: 'virtual', nextCompteurId: 'virtual', at: '2026-04-01'})
  t.truthy(validate({...original, at: '2026-05-01'}, {target: pendingTarget, originalEvent: original, draft: {meterEvents: [next]}}).fieldErrors.at)
})

test('une édition ne peut déplacer des relevés déjà saisis de part et d’autre du changement', t => {
  const original = event()
  const reading = {
    targetId: target.id, compteurId: 'meter-b', readingDate: '2026-04-01', value: '130'
  }
  for (const at of ['2026-04-01', '2026-05-01']) {
    t.truthy(validate(event({at}), {originalEvent: original, draft: {readings: [reading]}}).fieldErrors.at)
  }

  t.falsy(validate(event({at: '2026-03-15'}), {originalEvent: original, draft: {readings: [reading]}}).fieldErrors.at)
  t.falsy(validate(event({at: '2026-05-01'}), {originalEvent: original, draft: {readings: [{...reading, targetId: 'point-b'}]}}).fieldErrors.at)
  t.truthy(validate(event({at: '2026-05-01'}), {originalEvent: original, context: {...context, responses: {INDEX: {draft: {readings: [reading]}}}}}).fieldErrors.at)
})

test('changer les index reste autorisé mais une identité avec des relevés dépendants reste protégée', t => {
  const original = event()
  const draft = {
    readings: [{
      targetId: target.id, compteurId: 'meter-b', readingDate: '2026-04-01', value: '130'
    }]
  }
  t.deepEqual(validate(event({previousIndex: '121'}), {originalEvent: original, draft}).messages, [])
  t.truthy(validate(reset(), {originalEvent: original, draft}).fieldErrors.type)
  t.truthy(validate(event({nextCompteurId: 'meter-c'}), {originalEvent: original, draft}).fieldErrors.nextCompteurId)
})

test('normaliser un ancien RESET sans nextCompteurId ne change pas son identité ni ne bloque ses relevés', t => {
  const original = reset({nextCompteurId: undefined})
  const draft = {
    readings: [{
      targetId: target.id, compteurId: 'meter-a', readingDate: '2026-04-01', value: '130'
    }], meterEvents: [original]
  }
  t.deepEqual(validate(reset({previousIndex: '121'}), {originalEvent: original, draft}).messages, [])
})

test('transformer un RESET connu sans dépendance en remplacement crée seulement le nouveau compteur', t => {
  const original = reset()
  const replacement = pendingEvent({previousCompteurId: 'meter-a'})
  t.deepEqual(validate(replacement, {originalEvent: original}).messages, [])
  const draft = {
    readings: [{
      targetId: target.id, compteurId: 'meter-a', readingDate: '2026-04-01', value: '130'
    }]
  }
  t.truthy(validate(replacement, {originalEvent: original, draft}).fieldErrors.type)
})

test('une transition déjà enregistrée ne bloque pas un relevé saisi pendant la seconde sauvegarde échouée', t => {
  const original = pendingEvent()
  const accepted = reset({previousCompteurId: null, nextCompteurId: null})
  const anonymous = {...target, meters: [], meterlessInitial: true}
  const draft = {
    readings: [{
      targetId: target.id, compteurId: null, readingDate: '2026-04-01', value: '130'
    }]
  }
  const acknowledged = {...context, responses: {INDEX: {draft: {meterEvents: [accepted], readings: []}}}}
  t.deepEqual(validate(accepted, {
    target: anonymous, context: acknowledged, originalEvent: original, draft
  }).messages, [])
  const otherIdentity = {...acknowledged, responses: {INDEX: {draft: {meterEvents: [original], readings: []}}}}
  t.truthy(validate(accepted, {
    target: anonymous, context: otherIdentity, originalEvent: original, draft
  }).fieldErrors.type)
})

test('le rejeu utilise seulement la date exacte déjà acceptée et ne permet pas un autre déplacement', t => {
  const original = reset()
  const accepted = reset({at: '2026-05-01'})
  const draft = {
    readings: [{
      targetId: target.id, compteurId: 'meter-a', readingDate: '2026-04-01', value: '130'
    }]
  }
  const acknowledged = {...context, responses: {INDEX: {draft: {meterEvents: [accepted], readings: []}}}}
  t.deepEqual(validate(accepted, {context: acknowledged, originalEvent: original, draft}).messages, [])
  const otherDate = {...acknowledged, responses: {INDEX: {draft: {meterEvents: [reset({at: '2026-04-15'})], readings: []}}}}
  t.truthy(validate(accepted, {context: otherDate, originalEvent: original, draft}).fieldErrors.at)
})

test('la validation ne modifie ni le brouillon, ni les relevés, ni les événements', t => {
  const candidate = event()
  const draft = {readings: [{targetId: target.id, value: '123.1234'}], meterEvents: [candidate]}
  const before = structuredClone({target, context, draft})
  validate(candidate, {draft, originalEvent: candidate})
  t.deepEqual({target, context, draft}, before)
})

test('les erreurs datées sont rattachées seulement à la carte et au compteur concernés', t => {
  const candidate = event()
  const issues = [
    {
      code: 'INVALID_METER_EVENT', targetId: target.id, compteurId: 'meter-a', at: candidate.at
    },
    {
      code: 'INVALID_METER_EVENT', targetId: 'point-b', compteurId: 'meter-a', at: candidate.at
    },
    {
      code: 'INVALID_METER_EVENT', targetId: target.id, compteurId: 'meter-c', at: candidate.at
    },
    {
      code: 'INVALID_METER_EVENT', targetId: target.id, compteurId: 'meter-a', at: '2026-05-01'
    },
    {
      code: 'MISSING_READING', targetId: target.id, compteurId: 'meter-a', readingDate: '2026-01-01'
    },
    {code: 'METER_TRANSITION_REQUIRED', targetId: target.id, compteurId: 'meter-a'}
  ]
  t.deepEqual(campaignMeterEventIssues({event: candidate, target, issues}), ['Vérifiez la date, les compteurs et les index de ce changement.'])
})

test('une baisse d’index ne concerne que les bornes avant ou après réellement portées par cet événement', t => {
  const candidate = event()
  const issue = {code: 'NEGATIVE_DELTA_REQUIRES_EVENT', targetId: target.id}
  const issues = [
    {
      ...issue, compteurId: 'meter-a', from: '2026-01-01', to: candidate.at
    },
    {
      ...issue, compteurId: 'meter-b', from: candidate.at, to: '2026-07-01'
    }
  ]
  t.is(campaignMeterEventIssues({event: candidate, target, issues}).length, 1)
  t.deepEqual(campaignMeterEventIssues({
    event: candidate, target, issues: [
      {
        ...issue, compteurId: 'meter-a', from: candidate.at, to: '2026-07-01'
      },
      {
        ...issue, compteurId: 'meter-b', from: '2026-01-01', to: candidate.at
      },
      {
        ...issue, compteurId: 'meter-a', from: '2026-01-01', to: '2026-07-01'
      }
    ]
  }), [])
})

test('les erreurs serveur ciblées gardent leur message et les index inconnus justifiés ne sont pas signalés', t => {
  const candidate = reset({previousCompteurId: null, nextCompteurId: null})
  const issues = [
    {
      code: 'METER_EVENT_AFTER_EXIT', targetId: target.id, compteurId: null, at: candidate.at, field: 'at', message: 'Le compteur a déjà été remplacé.'
    },
    {
      code: 'MISSING_READING', targetId: target.id, compteurId: null, readingDate: candidate.at, justified: true
    }
  ]
  t.deepEqual(campaignMeterEventIssues({event: candidate, target, issues}), ['Le compteur a déjà été remplacé.'])
})

test('une erreur sans compteur n’est associée que si une seule carte possède cette date', t => {
  const candidate = event()
  const issues = [{targetId: target.id, at: candidate.at, message: 'Date à corriger.'}]
  t.deepEqual(campaignMeterEventIssues({
    event: candidate, target, issues, draft: {meterEvents: [candidate]}
  }), ['Date à corriger.'])
  t.deepEqual(campaignMeterEventIssues({
    event: candidate, target, issues, draft: {meterEvents: [candidate, reset({previousCompteurId: 'meter-c', nextCompteurId: 'meter-c'})]}
  }), [])
})
