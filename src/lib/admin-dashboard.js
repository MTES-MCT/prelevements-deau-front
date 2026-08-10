import {
  addDays,
  addMonths,
  endOfMonth,
  formatDateInput,
  parseDateInput,
  startOfMonth
} from './date-range.js'

export const ADMIN_DASHBOARD_MAX_RANGE_DAYS = 366
export const ADMIN_DASHBOARD_WEEKLY_THRESHOLD_DAYS = 90
export const ADMIN_DASHBOARD_LATEST_DECLARATIONS_HREF = '/declarations?types=MANUAL,SPREADSHEET,API'

const ACTIVITY_FIELDS = [
  'declarations',
  'manualDeclarations',
  'spreadsheetDeclarations',
  'otherDeclarations',
  'failed'
]

export function hasAdminDashboardDeclarationActivity(metrics = {}) {
  return Number(metrics.declarationsReceived ?? 0) > 0
}

export function getParisDateInput(now = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Paris',
    year: 'numeric'
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function getAdminDashboardDefaultRange(now = new Date()) {
  const today = getParisDateInput(now)

  return {
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today
  }
}

export function buildAdminDashboardDateRangePresets(maxDate) {
  const today = parseDateInput(maxDate) ?? new Date()
  const currentMonthStart = startOfMonth(today)
  const previousMonthStart = addMonths(currentMonthStart, -1)

  return [
    {
      label: 'Mois en cours',
      startDate: formatDateInput(currentMonthStart),
      endDate: formatDateInput(today)
    },
    {
      label: '7 derniers jours',
      startDate: formatDateInput(addDays(today, -6)),
      endDate: formatDateInput(today)
    },
    {
      label: '30 derniers jours',
      startDate: formatDateInput(addDays(today, -29)),
      endDate: formatDateInput(today)
    },
    {
      label: '90 derniers jours',
      startDate: formatDateInput(addDays(today, -89)),
      endDate: formatDateInput(today)
    },
    {
      label: 'Mois précédent',
      startDate: formatDateInput(previousMonthStart),
      endDate: formatDateInput(endOfMonth(previousMonthStart))
    },
    {
      label: 'Année en cours',
      startDate: `${today.getFullYear()}-01-01`,
      endDate: formatDateInput(today)
    }
  ]
}

function getWeekStart(date) {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return addDays(date, -daysSinceMonday)
}

export function aggregateAdminDashboardActivity(
  dailyActivity,
  periodDays = dailyActivity.length
) {
  if (periodDays <= ADMIN_DASHBOARD_WEEKLY_THRESHOLD_DAYS) {
    return {
      granularity: 'day',
      items: dailyActivity
    }
  }

  const weeks = new Map()

  for (const item of dailyActivity) {
    const date = parseDateInput(item.date)

    if (!date) {
      continue
    }

    const weekStart = formatDateInput(getWeekStart(date))
    const current = weeks.get(weekStart) ?? Object.fromEntries([
      ['date', weekStart],
      ...ACTIVITY_FIELDS.map(field => [field, 0])
    ])

    for (const field of ACTIVITY_FIELDS) {
      current[field] += Number(item[field] ?? 0)
    }

    weeks.set(weekStart, current)
  }

  return {
    granularity: 'week',
    items: [...weeks.values()]
  }
}
