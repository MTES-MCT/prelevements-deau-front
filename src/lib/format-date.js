import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid
} from 'date-fns'
import {fr} from 'date-fns/locale'

/**
 * Safely parse a date string into a Date object.
 * Uses parseISO for ISO strings to ensure cross-browser compatibility (Safari).
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date|null} Valid Date object or null if invalid
 */
export function safeParseDate(dateInput) {
  if (!dateInput) {
    return null
  }

  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null
  }

  // Only accept string or Date input, otherwise return null
  if (typeof dateInput === 'string') {
    const date = parseISO(dateInput)
    return isValid(date) ? date : null
  }

  // Unsupported type
  return null
}

function formatDate(date) {
  if (!date) {
    return null
  }

  const parsedDate = safeParseDate(date)
  if (!parsedDate) {
    return null
  }

  return format(parsedDate, 'dd/MM/yyyy')
}

export function formatFullDateFr(dateString) {
  if (!dateString) {
    return null
  }

  const date = safeParseDate(dateString)
  if (!date) {
    return null
  }

  const dayNum = date.getDate()
  const day = dayNum === 1 ? '1er' : String(dayNum).padStart(2, '0')
  const month = format(date, 'MMMM', {locale: fr})

  const year = date.getFullYear()
  if (year === 1) {
    return `${day} ${month}`
  }

  return `${day} ${month} ${year}`
}

export function formatDateRange(start, end) {
  const startFormated = formatFullDateFr(start)
  const endFormated = formatFullDateFr(end)

  if (startFormated && endFormated) {
    return `Du ${startFormated} au ${endFormated}`
  }

  if (startFormated) {
    return `Depuis le ${startFormated}`
  }

  if (endFormated) {
    return `Jusqu’au ${endFormated}`
  }

  return 'Non renseignée'
}

export function getDefaultDate(periodType, today = new Date()) {
  return periodType === 'month'
    ? startOfMonth(today)
    : startOfWeek(today, {weekStartsOn: 1})
}

export function getRange(dates, periodType) {
  if (!Array.isArray(dates) || dates.length === 0) {
    return {from: null, to: null, ranges: []}
  }

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const ranges = sorted.map(date =>
    periodType === 'month'
      ? {from: startOfMonth(date), to: endOfMonth(date)}
      : {from: startOfWeek(date, {weekStartsOn: 1}), to: endOfWeek(date, {weekStartsOn: 1})}
  )
  return {
    from: ranges[0].from,
    to: ranges.at(-1).to,
    ranges
  }
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export function getMonthPeriodRange(start, end, maxSelections) {
  const startValue = (start.year * 12) + start.month
  const endValue = (end.year * 12) + end.month
  const monthsCount = Math.abs(endValue - startValue) + 1
  const minValue = Math.min(startValue, endValue)

  return Array.from({length: monthsCount}, (_, index) => {
    const monthValue = minValue + index
    return {
      type: 'month',
      year: Math.floor(monthValue / 12),
      month: monthValue % 12
    }
  }).slice(0, maxSelections || undefined)
}

/**
 * Parses a quarter date string (YYYY-Q[1-4]) and returns a Date object
 * set to the first day of the first month of that quarter.
 * Returns null if the input is not a valid quarter format.
 * @param {string} dateString - Date string in format YYYY-Q[1-4] (e.g., 2024-Q1, 2024-Q4)
 * @returns {Date|null} Date object or null if invalid
 */
export function parseQuarterDate(dateString) {
  if (typeof dateString !== 'string') {
    return null
  }

  const quarterMatch = dateString.match(/^(\d{4})-Q([1-4])$/)
  if (!quarterMatch) {
    return null
  }

  const year = Number.parseInt(quarterMatch[1], 10)
  const quarter = Number.parseInt(quarterMatch[2], 10)
  const month = (quarter - 1) * 3
  return new Date(year, month, 1, 0, 0, 0, 0)
}

export default formatDate
