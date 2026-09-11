import {isCampaignDay} from './campaign-calendar.js'
import {campaignHasUnreferencedMeter} from './campaign-response-readings.js'
import {campaignCalculationIssue, campaignDate, isNonNegativeDecimal} from './collection-campaigns.js'

const day = value => value instanceof Date ? value.toISOString().slice(0, 10) : value?.slice(0, 10)
const text = value => typeof value === 'string' ? value.trim() : ''
const sameEvent = (left, right) => Boolean(left && right && left.targetId === right.targetId
  && left.previousCompteurId === right.previousCompteurId && left.at === right.at)
const identityNextId = event => event.type === 'RESET' ? event.previousCompteurId : (event.nextCompteurId ?? null)
const sameIdentity = (left, right) => sameEvent(left, right) && left.type === right.type
  && Boolean(left.nextMeter) === Boolean(right.nextMeter)
  && (left.nextMeter ? ['serialNumber', 'identifier'].every(field => text(left.nextMeter[field]) === text(right.nextMeter[field]))
    : identityNextId(left) === identityNextId(right))
const nextMeterId = (event, target) => event.type === 'RESET' ? event.previousCompteurId : (event.nextCompteurId
  || (event.nextMeter ? target?.meters?.find(meter => meter.pending && meter.pendingEvent?.previousCompteurId === event.previousCompteurId
    && day(meter.pendingEvent.at) === event.at)?.compteurId : undefined))
const setError = (errors, field, message) => {
  errors[field] ||= message
}

const meterOnDate = (target, id, at) => {
  const meters = (target?.meters || []).filter(meter => meter.compteurId === id)
  return meters.find(meter => (!meter.startDate || day(meter.startDate) <= at) && (!meter.endDate || day(meter.endDate) >= at)) || meters[0]
}

function otherEvents(event, draft, originalEvent) {
  const events = draft.meterEvents || []
  const current = events.findIndex(item => item === event || (originalEvent && sameEvent(item, originalEvent)))
  return events.filter((item, index) => index !== current && item.targetId === event.targetId)
}

function validateFields(event, target, errors) {
  if (!target || target.id !== event.targetId) {
    errors.targetId = 'Choisissez un point que vous pouvez renseigner.'
  }

  if (!['RESET', 'REPLACEMENT'].includes(event.type)) {
    errors.type = 'Choisissez le type de changement de compteur.'
  }

  for (const field of ['previousIndex', 'nextIndex']) {
    if (event[field] !== null && !isNonNegativeDecimal(event[field])) {
      errors[field] = 'Saisissez un index positif ou nul, ou cochez « Index inconnu ».'
    }
  }

  if (!text(event.reason) || text(event.reason).length > 2000) {
    errors.reason = 'Précisez le motif du changement (2 000 caractères maximum).'
  }

  const meterIds = new Set(target?.meters?.map(meter => meter.compteurId))
  if (!meterIds.has(event.previousCompteurId) && !(event.previousCompteurId === null && target && campaignHasUnreferencedMeter(target))) {
    errors.previousCompteurId = 'Choisissez le compteur concerné.'
  }

  if (event.type === 'RESET') {
    if (event.nextMeter || (event.nextCompteurId !== undefined && event.nextCompteurId !== event.previousCompteurId)) {
      errors.nextCompteurId = 'Une remise à zéro concerne le même compteur avant et après.'
    }
  } else if (event.type === 'REPLACEMENT') {
    validateReplacement(event, meterIds, errors)
  }
}

function validateReplacement(event, meterIds, errors) {
  if (event.nextMeter) {
    if (!text(event.nextMeter.serialNumber) && !text(event.nextMeter.identifier)) {
      errors.serialNumber = 'Renseignez le numéro de série ou un nom permettant d’identifier ce compteur.'
    }

    for (const field of ['serialNumber', 'identifier']) {
      if (text(event.nextMeter[field]).length > 200) {
        errors[field] = 'Utilisez 200 caractères maximum.'
      }
    }

    if (event.nextCompteurId !== undefined) {
      errors.nextCompteurId = 'Choisissez un compteur existant ou renseignez un nouveau compteur, pas les deux.'
    }
  } else if (!meterIds.has(event.nextCompteurId) || event.nextCompteurId === event.previousCompteurId) {
    errors.nextCompteurId = 'Choisissez un nouveau compteur, différent de l’ancien.'
  }
}

function validateServiceDate(event, meter, label, errors) {
  const start = day(meter?.startDate)
  const end = day(meter?.endDate)
  if (isCampaignDay(start) && event.at < start) {
    setError(errors, 'at', `${label} est en service à partir du ${campaignDate(start)}.`)
  }

  if (isCampaignDay(end) && event.at > end) {
    setError(errors, 'at', `${label} n’est plus en service après le ${campaignDate(end)}.`)
  }
}

function validateDates(event, {target, campaign, others, originalEvent}, errors) {
  if (!isCampaignDay(event.at)) {
    errors.at = 'Renseignez une date de changement valide.'
    return
  }

  const dates = [...(campaign.indexDates || []), ...(campaign.periods || [])
    .flatMap(period => period.kind === 'INDEX' ? [period.startReadingDate, period.endReadingDate] : [])].map(value => day(value)).filter(value => isCampaignDay(value)).sort()
  if ((dates[0] && event.at < dates[0]) || (dates.at(-1) && event.at > dates.at(-1))) {
    errors.at = `Le changement doit avoir eu lieu entre le ${campaignDate(dates[0])} et le ${campaignDate(dates.at(-1))}.`
  }

  const previous = event.previousCompteurId === null ? {endDate: target?.meterlessEndDate}
    : meterOnDate(target, event.previousCompteurId, event.at)
  validateServiceDate(event, previous, 'Le compteur concerné', errors)
  if (event.type === 'REPLACEMENT' && !event.nextMeter) {
    validateServiceDate(event, meterOnDate(target, event.nextCompteurId, event.at), 'Le nouveau compteur', errors)
  }

  if (others.some(item => sameEvent(item, event))) {
    setError(errors, 'at', 'Un changement est déjà renseigné pour ce compteur à cette date.')
  }

  validateChronology(event, {target, others: others.filter(item => isCampaignDay(item.at)), originalEvent}, errors)
}

function validateChronology(event, {target, others, originalEvent}, errors) {
  const previousId = event.previousCompteurId
  const nextId = nextMeterId(event, target) ?? (event.nextMeter && originalEvent?.nextMeter ? nextMeterId(originalEvent, target) : undefined)
  const replacements = others.filter(item => item.type === 'REPLACEMENT')
  const entry = replacements.find(item => nextMeterId(item, target) !== undefined && nextMeterId(item, target) === previousId)
  if (entry && event.at <= entry.at) {
    setError(errors, 'at', `Ce changement doit avoir lieu après la mise en service du compteur le ${campaignDate(entry.at)}.`)
  }

  const exit = replacements.find(item => item.previousCompteurId === previousId)
  if (exit) {
    if (event.type === 'REPLACEMENT') {
      setError(errors, 'previousCompteurId', `Ce compteur est déjà remplacé le ${campaignDate(exit.at)}.`)
    } else if (event.at >= exit.at) {
      setError(errors, 'at', `La remise à zéro doit précéder le remplacement du compteur le ${campaignDate(exit.at)}.`)
    }
  }

  if (event.type !== 'REPLACEMENT') {
    return
  }

  const previousUse = others.find(item => item.type === 'RESET' && item.previousCompteurId === previousId && item.at >= event.at)
  if (previousUse) {
    setError(errors, 'at', `Ce remplacement doit suivre la remise à zéro du ${campaignDate(previousUse.at)} sur l’ancien compteur.`)
  }

  if (nextId === undefined) {
    return
  }

  const otherEntry = replacements.find(item => nextMeterId(item, target) === nextId)
  if (otherEntry) {
    setError(errors, 'nextCompteurId', `Ce compteur est déjà installé lors du changement du ${campaignDate(otherEntry.at)}.`)
  }

  const following = others.find(item => item.previousCompteurId === nextId && event.at >= item.at)
  if (following) {
    setError(errors, 'at', `Ce remplacement doit précéder le changement du ${campaignDate(following.at)} qui utilise le nouveau compteur.`)
  }
}

function validateEdit(event, {original, target, draft, context, others}, errors) {
  if (!original) {
    return
  }

  if (original.type === 'REPLACEMENT' && !original.nextMeter && original.nextCompteurId && event.nextMeter) {
    setError(errors, 'nextCompteurId', 'Ce compteur est déjà référencé. Modifiez seulement la date, les index ou le motif du changement.')
  }

  const nextId = nextMeterId(original, target)
  const ids = new Set([original.previousCompteurId, nextId].filter(id => id !== undefined))
  const readings = [...(context.responses?.INDEX?.draft?.readings || []), ...(draft.readings || [])]
    .filter(reading => reading.targetId === event.targetId && ids.has(reading.compteurId))
  if (isCampaignDay(original.at) && isCampaignDay(event.at) && original.at !== event.at) {
    const [start, end] = [original.at, event.at].sort()
    if (readings.some(reading => day(reading.readingDate) >= start && day(reading.readingDate) <= end)) {
      setError(errors, 'at', 'Cette date déplacerait des relevés déjà saisis d’un côté à l’autre du changement. Corrigez d’abord les relevés concernés.')
    }
  }

  validateIdentityEdit(event, {
    original, nextId, readings, others
  }, errors)
}

function validateIdentityEdit(event, {original, nextId, readings, others}, errors) {
  const typeChanged = original.type !== event.type
  const previousChanged = original.previousCompteurId !== event.previousCompteurId
  const nextChanged = Boolean(original.nextMeter) !== Boolean(event.nextMeter)
    || (!original.nextMeter && identityNextId(original) !== identityNextId(event))
  if ((typeChanged || previousChanged || nextChanged) && (readings.some(reading => day(reading.readingDate) >= original.at)
    || others.some(item => nextId !== undefined && (item.previousCompteurId === nextId || item.nextCompteurId === nextId)))) {
    const field = typeChanged ? 'type' : (previousChanged ? 'previousCompteurId' : 'nextCompteurId')
    setError(errors, field, 'Des relevés ou d’autres changements dépendent de ce compteur. Corrigez-les avant de modifier le type de changement ou les compteurs concernés.')
  }
}

/** Validate this event only; incomplete readings elsewhere do not block its draft. */
export function validateCampaignMeterEvent({event, context = {}, target, draft = {}, originalEvent}) {
  target ||= context.targets?.find(target => target.id === event.targetId)
  originalEvent ||= event.previousEvent && draft.meterEvents?.find(item => sameEvent(item, {...event.previousEvent, targetId: event.targetId}))
  const fieldErrors = {}
  const others = otherEvents(event, draft, originalEvent)
  validateFields(event, target, fieldErrors)
  validateDates(event, {
    target, campaign: context.campaign || {}, others, originalEvent
  }, fieldErrors)
  // A previous write may have succeeded while a newer queued reading failed.
  // Only the exact identity already acknowledged by the server is a new baseline.
  const canonicalEvent = context.responses?.INDEX?.draft?.meterEvents?.find(item => sameIdentity(item, event))
  validateEdit(event, {
    original: canonicalEvent || originalEvent, target, draft, context, others
  }, fieldErrors)
  return {fieldErrors, messages: [...new Set(Object.values(fieldErrors))]}
}

function concernsEvent(issue, event, target, draft) {
  if (issue.targetId !== event.targetId || issue.justified) {
    return false
  }

  const nextId = nextMeterId(event, target)
  if (Object.hasOwn(issue, 'compteurId')) {
    if (issue.compteurId !== event.previousCompteurId && (nextId === undefined || issue.compteurId !== nextId)) {
      return false
    }
  } else if ((draft.meterEvents || []).filter(item => item.targetId === event.targetId && item.at === event.at).length !== 1) {
    return false
  }

  if ((issue.at !== undefined && issue.at === event.at) || (issue.readingDate !== undefined && issue.readingDate === event.at)) {
    return true
  }

  return (issue.from === event.at && nextId !== undefined && issue.compteurId === nextId)
    || (issue.to === event.at && issue.compteurId === event.previousCompteurId)
}

/** Attach only a precise event date or a volume-segment boundary to its card. */
export function campaignMeterEventIssues({event, issues = [], target, draft = {}}) {
  const messages = {
    INVALID_METER_EVENT_DATE: 'La date du changement est invalide.',
    INVALID_METER_EVENT: 'Vérifiez la date, les compteurs et les index de ce changement.'
  }
  return [...new Set(issues.filter(issue => concernsEvent(issue, event, target, draft))
    .map(issue => issue.message || messages[issue.code] || campaignCalculationIssue(issue)))]
}
