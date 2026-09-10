import {campaignScheduleErrors, isCampaignDay} from './campaign-calendar.js'
import {
  campaignExclusiveEnd, campaignInclusiveEnd, campaignInstant, campaignWallTime
} from './collection-campaigns.js'

export const CAMPAIGN_CONFIG_STEPS = ['Organisation', 'Calendrier', 'Points concernés']

function deadlineWallTime(value, timezone) {
  const wallTime = campaignWallTime(value, timezone)
  // A deadline at midnight excludes that new day: display the last allowed day.
  return wallTime.endsWith('T00:00') ? `${campaignInclusiveEnd(wallTime)}T23:59` : wallTime
}

const isDay = isCampaignDay

export function campaignIndexPeriods(indexDates) {
  if (indexDates.length < 2 || indexDates.some((date, index) => !isDay(date) || (index > 0 && date <= indexDates[index - 1]))) {
    return []
  }

  // Consecutive readings define contiguous, half-open intervals [start, end).
  // No separately editable dates or meter identities are inferred here.
  return indexDates.slice(1).map((date, position) => ({
    kind: 'INDEX', position, label: `Période ${position + 1}`,
    startDate: indexDates[position], endDate: date,
    startReadingDate: indexDates[position], endReadingDate: date
  }))
}

const synchronizedPeriods = (indexDates, periods) => [...campaignIndexPeriods(indexDates), ...periods.filter(period => period.kind === 'NEEDS')]

// Dates proposées, modifiables pour chaque collecte. Les volumes suivent
// les relevés ; seul le calendrier des besoins est indépendant.
export function defaultCampaignCalendar(year) {
  const y = Number(year)
  const indexDates = [`${y - 1}-10-31`, `${y}-06-01`, `${y}-10-31`]
  return {
    indexDates,
    periods: [
      ...campaignIndexPeriods(indexDates),
      {
        kind: 'NEEDS', position: 0, label: 'Période 1', startDate: `${y + 1}-06-01`, endDate: `${y + 1}-11-01`
      },
      {
        kind: 'NEEDS', position: 1, label: 'Période 2', startDate: `${y + 1}-11-01`, endDate: `${y + 2}-06-01`
      }
    ]
  }
}

export function initialCampaignConfiguration(context, options = {}, year = new Date().getFullYear()) {
  const campaign = context?.campaign
  const zoneId = campaign?.zoneId || (options.zones?.length === 1 ? options.zones[0].id : '')
  const timezone = campaign?.timezone || 'Europe/Paris'
  const calendar = campaign ? {
    indexDates: campaign.indexDates.map(date => date.slice(0, 10)).sort(),
    periods: campaign.periods.map(({id, kind, position, label, startDate, endDate, startReadingDate, endReadingDate}) => ({
      id, kind, position, label, startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10), ...(kind === 'INDEX' ? {startReadingDate: startReadingDate?.slice(0, 10), endReadingDate: endReadingDate?.slice(0, 10)} : {})
    }))
  } : defaultCampaignCalendar(year)
  // Existing campaign data is not written on load. Only editable drafts adopt
  // the simplified calendar; open/closed campaigns keep their stored periods.
  if (campaign?.status === 'DRAFT') {
    calendar.periods = synchronizedPeriods(calendar.indexDates, calendar.periods)
  }

  return {
    name: campaign?.name || `Relevés ${year} et besoins ${year + 1}`,
    year: campaign?.year || year,
    zoneId,
    ownerCollecteurUserId: campaign?.ownerCollecteurUserId || (zoneId && options.collecteurs?.length === 1 ? options.collecteurs[0].userId : ''),
    ...calendar,
    targets: context?.targets?.map(target => ({exploitationId: target.exploitationId, eligibilityConfirmed: target.eligibilityConfirmed === true})) || [],
    managers: campaign?.managers?.map(manager => ({userId: manager.userId, role: manager.role})) || [],
    timezone,
    opensAt: campaignWallTime(campaign?.opensAt, timezone),
    closesAt: deadlineWallTime(campaign?.closesAt, timezone),
    reminderDays: campaign?.reminderDays || [],
    openingMessage: campaign?.openingMessage || ''
  }
}

function organizationErrors(form) {
  const errors = []
  if (!form.name.trim()) {
    errors.push('Donnez un nom à la campagne.')
  }

  if (!Number.isInteger(Number(form.year)) || Number(form.year) < 2000 || Number(form.year) > 2200) {
    errors.push('L’année des relevés doit être comprise entre 2000 et 2200.')
  }

  if (!form.zoneId) {
    errors.push('Choisissez le territoire concerné.')
  }

  if (!form.ownerCollecteurUserId) {
    errors.push('Choisissez le collecteur responsable.')
  }

  return errors
}

function needsErrors(form) {
  const errors = []
  const periods = form.periods.filter(period => period.kind === 'NEEDS').sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (periods.length === 0) {
    errors.push('Ajoutez au moins une période de besoins.')
  }

  for (const [index, period] of periods.entries()) {
    if (!period.label.trim() || !isDay(period.startDate) || !isDay(period.endDate) || period.startDate >= period.endDate) {
      errors.push(`Vérifiez le nom et les dates de la période de besoins « ${period.label || index + 1} ».`)
    }

    if (index > 0 && periods[index - 1].endDate > period.startDate) {
      errors.push('Les périodes de besoins ne doivent pas se chevaucher.')
    }
  }

  return errors
}

export function campaignConfigurationErrors(form, step) {
  const errors = (step === 0 || step === undefined) ? organizationErrors(form) : []
  if (step === 1 || step === undefined) {
    if (form.indexDates.length < 2 || form.indexDates.some(date => !isDay(date)) || new Set(form.indexDates).size !== form.indexDates.length) {
      errors.push('Renseignez au moins deux dates de relevé différentes et valides.')
    } else if (form.indexDates.some((date, index) => index > 0 && date < form.indexDates[index - 1])) {
      errors.push('Les dates des relevés doivent se suivre dans l’ordre chronologique.')
    }

    if (form.indexDates.length > 100 || form.indexDates.length - 1 + form.periods.filter(period => period.kind === 'NEEDS').length > 100) {
      errors.push('Le calendrier est trop long. Retirez une date de relevé ou une période de besoins.')
    }

    errors.push(...needsErrors(form), ...campaignScheduleErrors(form))
  }

  return [...new Set(errors)]
}

export function campaignConfigurationPayload(form, campaign) {
  // Preserve existing instants on untouched edits, including a legacy deadline
  // with a specific hour. A newly chosen deadline includes the entire day.
  const periods = campaign && ['OPEN', 'CLOSED'].includes(campaign.status) ? form.periods : synchronizedPeriods(form.indexDates, form.periods)
  let closesAt
  if (campaign?.closesAt && form.closesAt === deadlineWallTime(campaign.closesAt, form.timezone)) {
    closesAt = new Date(campaign.closesAt).toISOString()
  } else {
    const deadline = form.closesAt.endsWith('T23:59') ? `${campaignExclusiveEnd(form.closesAt)}T00:00` : form.closesAt
    closesAt = campaignInstant(deadline, form.timezone)
  }

  return {
    ...form,
    name: form.name.trim(),
    year: Number(form.year),
    // Saving the selected points is the explicit inclusion decision; no second
    // confirmation checkbox is needed. This does not change their collection mode.
    targets: form.targets.map(target => ({...target, eligibilityConfirmed: true})),
    periods: ['INDEX', 'NEEDS'].flatMap(kind => periods.filter(period => period.kind === kind).map((period, position) => ({...period, position}))),
    opensAt: campaignInstant(form.opensAt, form.timezone),
    closesAt,
    ...(campaign ? {expectedVersion: campaign.version} : {})
  }
}

export function replaceCampaignReadingDate(form, index, value) {
  const indexDates = form.indexDates.map((date, position) => position === index ? value : date)
  return {indexDates, periods: synchronizedPeriods(indexDates, form.periods)}
}

export function addCampaignReadingDate(form) {
  if (form.indexDates.length >= 100 || form.indexDates.length + form.periods.filter(period => period.kind === 'NEEDS').length > 100) {
    return {indexDates: form.indexDates, periods: form.periods}
  }

  const indexDates = [...form.indexDates, '']
  return {indexDates, periods: synchronizedPeriods(indexDates, form.periods)}
}

export function removeCampaignReadingDate(form, index) {
  const indexDates = form.indexDates.length > 2 ? form.indexDates.filter((_date, position) => position !== index) : form.indexDates
  return {indexDates, periods: synchronizedPeriods(indexDates, form.periods)}
}

export function newCampaignPeriod(kind, periods) {
  const existing = periods.filter(period => period.kind === kind)
  const previous = existing.at(-1)
  return {
    kind, position: Math.max(-1, ...existing.map(period => period.position)) + 1,
    label: `Période ${existing.length + 1}`, startDate: previous?.endDate || '',
    endDate: previous?.endDate ? campaignExclusiveEnd(previous.endDate) : '',
    ...(kind === 'INDEX' ? {startReadingDate: '', endReadingDate: ''} : {})
  }
}
