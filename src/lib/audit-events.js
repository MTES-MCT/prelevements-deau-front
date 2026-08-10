const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_OPTIONS = [25, 50, 100]
const PARIS_TIME_ZONE = 'Europe/Paris'

function getSingleValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseCsv(value) {
  return [...new Set(String(getSingleValue(value) || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean))]
}

export function getParisDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

function shiftUtcDate(dateInput, {days = 0, months = 0}) {
  const date = new Date(`${dateInput}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function getDefaultAuditDateRange(today = getParisDateInput()) {
  return {
    from: shiftUtcDate(today, {days: -29}),
    to: today
  }
}

export function getAuditPeriodPresets(today = getParisDateInput()) {
  return [
    {key: '24h', label: '24 h', period: '24h'},
    {
      key: '7d',
      label: '7 jours',
      from: shiftUtcDate(today, {days: -6}),
      to: today
    },
    {key: '30d', label: '30 jours', ...getDefaultAuditDateRange(today)},
    {
      key: '90d',
      label: '90 jours',
      from: shiftUtcDate(today, {days: -89}),
      to: today
    },
    {
      key: '12m',
      label: '12 mois',
      from: shiftUtcDate(today, {months: -12, days: 1}),
      to: today
    },
    {key: 'all', label: 'Tout', period: 'all'}
  ]
}

export function normalizeAuditFilters(parameters = {}, {today = getParisDateInput()} = {}) {
  const defaultRange = getDefaultAuditDateRange(today)
  const period = ['24h', 'all'].includes(getSingleValue(parameters.period))
    ? getSingleValue(parameters.period)
    : ''
  const requestedPageSize = parsePositiveInteger(getSingleValue(parameters.pageSize), DEFAULT_PAGE_SIZE)

  return {
    actor: String(getSingleValue(parameters.actor) || ''),
    subject: String(getSingleValue(parameters.subject) || ''),
    from: String(getSingleValue(parameters.from) || defaultRange.from),
    to: String(getSingleValue(parameters.to) || defaultRange.to),
    period,
    actionTypes: parseCsv(parameters.actionTypes),
    outcomes: parseCsv(parameters.outcomes),
    page: parsePositiveInteger(getSingleValue(parameters.page), 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(requestedPageSize)
      ? requestedPageSize
      : DEFAULT_PAGE_SIZE
  }
}

export function buildAuditSearchParameters(filters) {
  const parameters = new URLSearchParams()

  if (filters.actor) {
    parameters.set('actor', filters.actor)
  }

  if (filters.subject) {
    parameters.set('subject', filters.subject)
  }

  if (filters.period) {
    parameters.set('period', filters.period)
  } else {
    parameters.set('from', filters.from)
    parameters.set('to', filters.to)
  }

  if (filters.actionTypes.length > 0) {
    parameters.set('actionTypes', filters.actionTypes.join(','))
  }

  if (filters.outcomes.length > 0) {
    parameters.set('outcomes', filters.outcomes.join(','))
  }

  if (filters.page > 1) {
    parameters.set('page', String(filters.page))
  }

  if (filters.pageSize !== DEFAULT_PAGE_SIZE) {
    parameters.set('pageSize', String(filters.pageSize))
  }

  return parameters
}

export function isAuditPresetActive(preset, filters) {
  if (preset.period) {
    return filters.period === preset.period
  }

  return !filters.period && filters.from === preset.from && filters.to === preset.to
}

export {DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS}
