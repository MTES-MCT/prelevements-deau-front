import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import {fr} from 'date-fns/locale'

function formatDate(date) {
  if (!date) {
    return null
  }

  return format(date, 'dd/MM/yyyy')
}

export function formatFullDateFr(dateString) {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
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

export function getMonthsRange(start, end, maxSelections) {
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

export default formatDate
