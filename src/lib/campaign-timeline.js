import {
  campaignResponseSchedule, campaignScheduleDay, isCampaignDay, shiftCampaignDay
} from './campaign-calendar.js'
import {campaignDate, campaignInstant} from './collection-campaigns.js'

const dayValue = value => Date.parse(`${value}T00:00:00Z`)
const monthStart = value => `${value.slice(0, 7)}-01`
const monthLabel = new Intl.DateTimeFormat('fr-FR', {month: 'short', timeZone: 'UTC'})

function civilDay(value) {
  if (value instanceof Date) {
    value = Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }

  if (isCampaignDay(value)) {
    return value
  }

  // Les colonnes Prisma @db.Date sont parfois sérialisées à minuit UTC.
  const match = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/.exec(value)
  return match && isCampaignDay(match[1]) ? match[1] : ''
}

function shiftMonth(value, months) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().split('T')[0]
}

// Date.parse normalise certaines dates impossibles. Vérifier d’abord le jour
// et l’heure fournis, sans prendre le fuseau du navigateur pour référence.
function scheduleDay(value, timezone, options) {
  if (value instanceof Date) {
    value = Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }

  if (typeof value !== 'string') {
    return ''
  }

  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value)
  if (!match || !isCampaignDay(match[1]) || Number(match[2] ?? 0) > 23 || Number(match[3] ?? 0) > 59 || Number(match[4] ?? 0) > 59
    || (match[4] && !match[5])) {
    return ''
  }

  try {
    if (options?.deadline && match[5]) {
      // Pour un instant persisté, retirer une seule milliseconde avant de
      // résoudre le jour : 00:00:10 appartient encore à la journée courante.
      return campaignScheduleDay(new Date(Date.parse(value) - 1).toISOString(), timezone)
    }

    return campaignScheduleDay(value, timezone, options)
  } catch {
    return ''
  }
}

function getReadings(indexDates, pending) {
  const seen = new Set()
  return indexDates.flatMap((value, index) => {
    const date = civilDay(value)
    const item = {id: `reading-${index}`, label: `Relevé ${index + 1}`, date}
    if (!isCampaignDay(date) || seen.has(date)) {
      pending.push({id: `${value ? 'invalid-' : ''}${item.id}`, label: item.label, detail: seen.has(date) ? 'Cette date de relevé est déjà présente.' : 'Date à préciser ou à corriger.'})
      return []
    }

    seen.add(date)
    if (index > 0 && civilDay(indexDates[index - 1]) && date < civilDay(indexDates[index - 1])) {
      pending.push({id: `invalid-${item.id}-order`, label: item.label, detail: 'Les relevés doivent être renseignés dans l’ordre chronologique.'})
    }

    return [item]
  }).sort((a, b) => a.date.localeCompare(b.date))
}

function getNeeds(periods, pending) {
  return periods.filter(period => period?.kind === 'NEEDS').map((period, index) => {
    const startDate = civilDay(period.startDate)
    const endDate = civilDay(period.endDate)
    const valid = isCampaignDay(startDate) && isCampaignDay(endDate) && startDate < endDate
    const item = {
      id: period.id || `need-${index}`, label: period.label || `Besoins ${index + 1}`,
      startDate: isCampaignDay(startDate) ? startDate : null,
      endDate: isCampaignDay(endDate) ? endDate : null,
      inclusiveEndDate: valid ? shiftCampaignDay(endDate, -1) : null,
      valid
    }
    if (!valid) {
      const invalid = (period.startDate && !startDate) || (period.endDate && !endDate) || (startDate && endDate)
      pending.push({id: `${invalid ? 'invalid-' : ''}${item.id}`, label: item.label, detail: item.startDate && item.endDate ? 'La fin de la période doit suivre son début.' : 'Dates de la période à préciser ou à corriger.'})
    }

    return item
  })
}

function getResponse(props, pending) {
  const timezone = props.timezone || 'Europe/Paris'
  try {
    new Intl.DateTimeFormat('fr-FR', {timeZone: timezone}).format(0)
  } catch {
    pending.push({id: 'invalid-timezone', label: 'Fuseau horaire', detail: 'Le fuseau horaire de la campagne est invalide.'})
  }

  const opening = scheduleDay(props.opensAt, timezone)
  const deadline = scheduleDay(props.closesAt, timezone, {deadline: true})
  const actualOpening = scheduleDay(props.openedAt, timezone)
  const actualClosing = props.status === 'CLOSED' ? scheduleDay(props.closedAt, timezone) : ''
  const events = []
  const addEvent = (id, label, date, detail) => {
    if (date) {
      events.push({
        id, label, date, detail
      })
    }
  }

  addEvent('opening', 'Ouverture au plus tôt', opening, 'Ouverture à votre initiative')
  addEvent('actual-opening', 'Ouverture effective', actualOpening, 'Ouverture enregistrée')
  addEvent('deadline', 'Date limite de réponse', deadline, 'Journée incluse')
  addEvent('actual-closing', 'Clôture effective', actualClosing, 'Clôture enregistrée')
  if (props.opensAt && !opening) {
    pending.push({id: 'invalid-opening', label: 'Ouverture au plus tôt', detail: 'Date d’ouverture à corriger.'})
  } else if (!opening && !actualOpening) {
    pending.push({id: 'opening', label: 'Ouverture des réponses', detail: 'À votre initiative, sans date définie.'})
  }

  if (props.closesAt && !deadline) {
    pending.push({id: 'invalid-deadline', label: 'Date limite de réponse', detail: 'Date limite à corriger.'})
  } else if (!deadline && !actualClosing) {
    pending.push({id: 'deadline', label: 'Date limite de réponse', detail: 'Aucune date limite définie.'})
  }

  if (props.openedAt && !actualOpening) {
    pending.push({id: 'invalid-actual-opening', label: 'Ouverture effective', detail: 'La date enregistrée est invalide.'})
  }

  if (props.status === 'CLOSED' && !actualClosing) {
    pending.push({id: `${props.closedAt ? 'invalid-' : ''}actual-closing`, label: 'Clôture effective', detail: 'Date de clôture non renseignée ou invalide.'})
  }

  const startDate = actualOpening || opening
  const lastDate = actualClosing || deadline
  const valid = Boolean(startDate && lastDate && startDate <= lastDate)
  if (opening && deadline && opening > deadline && startDate !== opening) {
    pending.push({id: 'invalid-planned-response-order', label: 'Calendrier prévu', detail: 'La date limite prévue précède l’ouverture au plus tôt.'})
  }

  if (startDate && lastDate && !valid) {
    pending.push({id: 'invalid-response-order', label: 'Période de réponse', detail: 'La clôture ne peut pas précéder l’ouverture des réponses.'})
  }

  const reminders = Array.isArray(props.reminderDays) ? props.reminderDays : []
  if (reminders.some(days => !Number.isInteger(days) || days < 0 || days > 365)) {
    pending.push({id: 'invalid-reminders', label: 'Relances prévues', detail: 'Les délais de relance doivent être compris entre 0 et 365 jours.'})
  }

  if (reminders.length > 0 && !deadline) {
    pending.push({id: 'reminders-deadline', label: 'Relances prévues', detail: 'Définissez une date limite pour situer les relances.'})
  } else if (deadline) {
    // Le helper partagé déduit les relances en jours civils, y compris au
    // changement d’heure. Le jour limite est déjà résolu dans le bon fuseau.
    const schedule = campaignResponseSchedule({closesAt: deadline, reminderDays: reminders, timezone})
    for (const reminder of schedule.reminders) {
      if ((actualOpening && reminder.date < actualOpening) || (actualClosing && reminder.date > actualClosing)) {
        continue
      }

      if (opening && reminder.date < opening) {
        if (!props.status || props.status === 'DRAFT') {
          pending.push({id: `invalid-reminder-${reminder.days}`, label: `Relance prévue à J${reminder.days ? `-${reminder.days}` : '0'}`, detail: 'Cette relance se situe en dehors de la période de réponse.'})
        }

        continue
      }

      addEvent(`reminder-${reminder.days}`, `Relance prévue à J${reminder.days ? `-${reminder.days}` : '0'}`, reminder.date, 'Réponses encore attendues')
    }
  }

  return {
    opening, deadline, actualOpening, actualClosing, startDate, endDate: valid ? shiftCampaignDay(lastDate, 1) : '', events: events.sort((a, b) => a.date.localeCompare(b.date)), valid
  }
}

function scheduleInstant(value, timezone, {deadline = false} = {}) {
  if (!value || !scheduleDay(value, timezone, {deadline})) {
    return Number.NaN
  }

  try {
    if (value instanceof Date || /(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      return new Date(value).getTime()
    }

    const wallTime = isCampaignDay(value) ? `${deadline ? shiftCampaignDay(value, 1) : value}T00:00` : value
    return Date.parse(campaignInstant(wallTime, timezone))
  } catch {
    return Number.NaN
  }
}

function nextReminderDate(campaign, response, now, timezone) {
  return response.events.find(event => {
    if (!event.id.startsWith('reminder-')) {
      return false
    }

    // Le planificateur envoie les relances à 9 h dans le fuseau de la campagne.
    // Ne pas présenter une échéance passée comme le prochain envoi à venir.
    const instant = scheduleInstant(`${event.date}T09:00`, timezone)
    return instant > now && (!campaign.opensAt || instant >= scheduleInstant(campaign.opensAt, timezone))
      && (!campaign.closesAt || instant < scheduleInstant(campaign.closesAt, timezone, {deadline: true}))
  })?.date ?? null
}

function draftPosition(position, {opening, beforeOpening, afterDeadline, timezone}) {
  const detail = afterDeadline ? 'La date limite est dépassée. Modifiez le calendrier avant d’ouvrir la saisie.'
    : (beforeOpening ? `Ouverture possible à partir du ${campaignDate(opening, true, timezone)}. Elle reste à déclencher depuis l’onglet Configuration.` : 'Vous pouvez ouvrir la saisie depuis l’onglet Configuration.')
  return {
    ...position, phase: 'PREPARATION', label: 'Campagne en préparation', tone: afterDeadline ? 'warning' : 'neutral',
    canOpen: !beforeOpening && !afterDeadline, detail
  }
}

function responseCountdown(remainingDays) {
  if (remainingDays === null) {
    return 'Aucune date limite définie.'
  }

  return remainingDays === 0 ? 'Dernier jour pour répondre.' : `Encore ${remainingDays} jour${remainingDays > 1 ? 's' : ''} pour répondre.`
}

function hasInvalidSchedule(campaign, {today, opening, deadline}) {
  return !today || (campaign.opensAt && !Number.isFinite(opening)) || (campaign.closesAt && !Number.isFinite(deadline))
    || (Number.isFinite(opening) && Number.isFinite(deadline) && opening >= deadline)
}

// L’horloge est fournie par la page : pas de Date.now() pendant le rendu SSR.
// Les statuts temporels décrivent les dates, jamais la réception de réponses.
export function getCampaignPosition(campaign = {}, now) {
  const timezone = campaign.timezone || 'Europe/Paris'
  const response = getResponse(campaign, [])
  const timestamp = now ? new Date(now).getTime() : Number.NaN
  const today = Number.isFinite(timestamp) ? scheduleDay(new Date(timestamp), timezone) : ''
  const position = {
    phase: 'UNKNOWN', label: 'Campagne ouverte', detail: '', tone: 'neutral', today,
    remainingDays: null, openingDate: response.opening, deadlineDate: response.deadline,
    actualOpeningDate: response.actualOpening, actualClosingDate: response.actualClosing,
    nextReminderDate: null, canOpen: false, canRemind: false, isResponseWindowOpen: false
  }
  if (campaign.status === 'CLOSED') {
    return {
      ...position, phase: 'CLOSED', label: 'Saisie terminée',
      detail: response.actualClosing ? `Campagne clôturée le ${campaignDate(response.actualClosing)}.` : 'Campagne clôturée. La date de clôture n’est pas renseignée.'
    }
  }

  const isDraft = !campaign.status || campaign.status === 'DRAFT'
  const opening = scheduleInstant(campaign.opensAt, timezone)
  const deadline = scheduleInstant(campaign.closesAt, timezone, {deadline: true})
  if (hasInvalidSchedule(campaign, {today, opening, deadline})) {
    return {
      ...position, ...(isDraft ? {phase: 'PREPARATION', label: 'Campagne en préparation'} : {}),
      detail: today ? 'Vérifiez les dates et le fuseau horaire du calendrier.' : ''
    }
  }

  const beforeOpening = Number.isFinite(opening) && timestamp < opening
  const afterDeadline = Number.isFinite(deadline) && timestamp >= deadline
  if (isDraft) {
    return draftPosition(position, {
      opening, beforeOpening, afterDeadline, timezone
    })
  }

  if (afterDeadline) {
    return {
      ...position, phase: 'EXPIRED', label: 'Date limite dépassée', tone: 'warning',
      detail: 'La période de réponse est terminée. La campagne n’est pas encore clôturée.'
    }
  }

  if (beforeOpening) {
    return {
      ...position, phase: 'SCHEDULED', label: 'Saisie à venir', tone: 'info',
      detail: `Début de la saisie le ${campaignDate(opening, true, timezone)}.`
    }
  }

  const remainingDays = response.deadline ? Math.round((dayValue(response.deadline) - dayValue(today)) / 86_400_000) : null
  return {
    ...position, phase: 'OPEN', label: 'Saisie ouverte', tone: 'success', remainingDays,
    detail: responseCountdown(remainingDays),
    canRemind: true, isResponseWindowOpen: true, nextReminderDate: nextReminderDate(campaign, response, timestamp, timezone)
  }
}

function buildAxis(extents) {
  if (extents.length === 0) {
    return {
      startDate: null, endDate: null, years: [], ticks: [], position: () => null
    }
  }

  const first = extents.map(item => item.startDate).sort()[0]
  const last = extents.map(item => item.endDate).sort().at(-1)
  const startDate = monthStart(first)
  const endDate = last === monthStart(last) ? last : shiftMonth(monthStart(last), 1)
  const start = dayValue(startDate)
  const duration = dayValue(endDate) - start
  const position = date => 100 * ((dayValue(date) - start) / duration)
  const years = []
  for (let year = Number(startDate.slice(0, 4)); year <= Number(endDate.slice(0, 4)); year++) {
    const start = [`${String(year).padStart(4, '0')}-01-01`, startDate].sort().at(-1)
    const end = [`${String(year + 1).padStart(4, '0')}-01-01`, endDate].sort()[0]
    if (start < end) {
      years.push({
        label: String(year), start, end, left: position(start), width: position(end) - position(start)
      })
    }
  }

  const months = ((Number(endDate.slice(0, 4)) - Number(startDate.slice(0, 4))) * 12) + Number(endDate.slice(5, 7)) - Number(startDate.slice(5, 7))
  const step = Math.max(1, Math.ceil(months / 12))
  const ticks = []
  for (let month = 0; month < months; month += step) {
    const date = shiftMonth(startDate, month)
    ticks.push({date, label: monthLabel.format(new Date(`${date}T00:00:00Z`)), left: position(date)})
  }

  return {
    startDate, endDate, years, ticks, position
  }
}

export function buildCampaignTimeline(props = {}) {
  const pending = []
  const readings = getReadings(Array.isArray(props.indexDates) ? props.indexDates : [], pending)
  const needs = getNeeds(Array.isArray(props.periods) ? props.periods : [], pending)
  const response = getResponse(props, pending)
  const extents = [
    ...readings.map(item => ({startDate: item.date, endDate: shiftCampaignDay(item.date, 1)})),
    ...needs.filter(item => item.valid),
    ...response.events.map(item => ({startDate: item.date, endDate: shiftCampaignDay(item.date, 1)})),
    ...(response.valid ? [response] : [])
  ]
  const {position, ...axis} = buildAxis(extents)
  const interval = item => item.valid ? {left: position(item.startDate), width: position(item.endDate) - position(item.startDate)} : {left: null, width: null}
  return {
    ...axis,
    readings: readings.map(item => ({...item, left: position(item.date)})),
    needs: needs.map(item => ({...item, ...interval(item)})),
    response: {...response, ...interval(response), events: response.events.map(item => ({...item, left: position(item.date)}))},
    pending
  }
}
