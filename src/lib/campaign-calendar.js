import {campaignInclusiveEnd, campaignWallTime} from './collection-campaigns.js'

export const isCampaignDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

export function shiftCampaignDay(value, days) {
  if (!isCampaignDay(value)) {
    return ''
  }

  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function campaignScheduleDay(value, timezone = 'Europe/Paris', {deadline = false} = {}) {
  if (!value) {
    return ''
  }

  // Form fields are local wall times. Persisted values are ISO instants.
  const wallTime = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value)
    ? value
    : (Number.isFinite(Date.parse(value)) ? campaignWallTime(value, timezone) : '')
  if (!isCampaignDay(wallTime.slice(0, 10))) {
    return ''
  }

  return deadline && wallTime.endsWith('T00:00') ? campaignInclusiveEnd(wallTime) : wallTime.slice(0, 10)
}

export function campaignResponseSchedule({opensAt, closesAt, reminderDays = [], timezone = 'Europe/Paris'}) {
  const opening = campaignScheduleDay(opensAt, timezone)
  const deadline = campaignScheduleDay(closesAt, timezone, {deadline: true})
  return {
    opening,
    deadline,
    reminders: [...new Set(reminderDays)].filter(days => Number.isInteger(days) && days >= 0 && days <= 365)
      .sort((a, b) => b - a)
      .map(days => ({days, date: shiftCampaignDay(deadline, -days)}))
  }
}

export function campaignScheduleErrors(form) {
  const errors = []
  const {opening, deadline, reminders} = campaignResponseSchedule(form)
  if ((form.opensAt && !opening) || (form.closesAt && !deadline)) {
    errors.push('Renseignez des dates d’ouverture et de clôture valides.')
  }

  if (form.opensAt && form.closesAt && form.opensAt >= form.closesAt) {
    errors.push('La date limite de réponse doit être postérieure au début de la saisie.')
  }

  const lastReading = form.indexDates.filter(date => isCampaignDay(date)).sort().at(-1)
  if (deadline && lastReading && deadline < lastReading) {
    errors.push('La date limite de réponse ne peut pas précéder le dernier relevé demandé.')
  }

  if (reminders.length > 0 && !deadline) {
    errors.push('Indiquez une date limite de réponse pour programmer les relances.')
  } else if (opening && reminders.some(reminder => reminder.date < opening)) {
    errors.push('Une relance est prévue avant le début de la saisie. Décalez l’ouverture ou choisissez une relance plus proche de la date limite.')
  }

  return errors
}
