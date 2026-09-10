import {readingKey} from './collection-campaigns.js'

const day = value => value?.slice(0, 10) || null
const hasValue = value => value !== undefined && value !== null && value !== ''
const boundaryKey = (compteurId, date) => `${compteurId}:${date}`

export function campaignHasUnreferencedMeter(target) {
  return typeof target.meterlessInitial === 'boolean' ? target.meterlessInitial : (target.meters || []).length === 0
}

export function campaignTargetMeterEvents(events = []) {
  const byTarget = new Map()
  for (const event of events) {
    if (!byTarget.has(event.targetId)) {
      byTarget.set(event.targetId, [])
    }

    byTarget.get(event.targetId).push(event)
  }

  return byTarget
}

const eventReading = (event, side) => ({side, value: event[`${side}Index`], missingReason: event[`${side}MissingReason`] || event.reason})

// Aligné sur les bornes de calculateMeter côté API. Les événements complètent
// les dates d'affectation sans modifier ni supprimer les relevés du brouillon.
export function campaignTargetIndexEntries({target, indexDates, readings, events = []}) {
  const pendingMeters = new Map((target.meters || []).filter(meter => meter.pending && meter.pendingEvent)
    .map(meter => [boundaryKey(meter.pendingEvent.previousCompteurId, day(meter.pendingEvent.at)), meter]))
  const targetEvents = events.filter(event => event.targetId === target.id).map(event => ({
    ...event, at: day(event.at),
    nextCompteurId: event.type === 'RESET' ? event.previousCompteurId : event.nextCompteurId || (event.nextMeter ? pendingMeters.get(boundaryKey(event.previousCompteurId, day(event.at)))?.compteurId : undefined)
  }))
  const replacements = targetEvents.filter(event => event.type === 'REPLACEMENT')
  const pendingIds = new Set(replacements.map(event => event.nextCompteurId))
  const meters = (target.meters || []).filter(meter => !meter.pending || pendingIds.has(meter.compteurId))
  if (campaignHasUnreferencedMeter(target)) {
    meters.unshift({compteurId: null, endDate: target.meterlessEndDate ?? null})
  }

  const bounds = new Map(meters.map(meter => [meter.compteurId, {start: day(meter.startDate), end: day(meter.endDate)}]))
  const eventReadings = new Map()
  for (const event of replacements) {
    const previous = bounds.get(event.previousCompteurId)
    const next = bounds.get(event.nextCompteurId)
    if (previous) {
      previous.end = previous.end && previous.end < event.at ? previous.end : event.at
      eventReadings.set(boundaryKey(event.previousCompteurId, event.at), [eventReading(event, 'previous')])
    }

    if (next) {
      next.start = next.start && next.start > event.at ? next.start : event.at
      eventReadings.set(boundaryKey(event.nextCompteurId, event.at), [eventReading(event, 'next')])
    }
  }

  for (const event of targetEvents.filter(event => event.type === 'RESET')) {
    const key = boundaryKey(event.previousCompteurId, event.at)
    if (!eventReadings.has(key)) {
      eventReadings.set(key, [eventReading(event, 'previous'), eventReading(event, 'next')])
    }
  }

  const awaitingMeters = replacements.filter(event => event.nextMeter && !event.nextCompteurId)
  return indexDates.flatMap(readingDate => {
    const date = day(readingDate)
    const active = meters.filter(meter => {
      const {start, end} = bounds.get(meter.compteurId)
      return (!start || start <= date) && (!end || end >= date)
    })
    const entries = active.map(meter => {
      const identity = {targetId: target.id, compteurId: meter.compteurId, readingDate: date}
      return {
        entryKey: readingKey(identity), date, meter, identity,
        value: readings.get(readingKey(identity)) || {...identity, value: null},
        eventReadings: eventReadings.get(boundaryKey(meter.compteurId, date))
      }
    })
    // Le serveur attribue l'identité virtuelle après l'enregistrement. Aucun
    // identifiant local ni index ne sont inventés pendant ce bref délai.
    for (const event of awaitingMeters.filter(event => event.at <= date)) {
      entries.push({
        entryKey: `${target.id}:pending:${event.previousCompteurId}:${event.at}:${date}`,
        date, meter: {compteur: event.nextMeter}, awaitingMeter: true,
        eventReadings: event.at === date ? [eventReading(event, 'next')] : undefined
      })
    }

    return entries.length > 0 ? entries : [{entryKey: date, date, unavailable: true}]
  })
}

export function campaignIndexEntryFilled(entry) {
  if (entry.eventReadings) {
    return entry.eventReadings.every(reading => hasValue(reading.value) || (reading.value === null && Boolean(reading.missingReason?.trim())))
  }

  return hasValue(entry.value?.value) || Boolean(entry.value?.missingReason?.trim())
}
