import {parseIsoWeekDate, parseQuarterDate} from '@/lib/format-date.js'
import {parseLocalDateTime} from '@/utils/time.js'

const addCalendarDays = (date, days) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate() + days,
  date.getHours(),
  date.getMinutes(),
  date.getSeconds(),
  date.getMilliseconds()
)

export const parseAggregationDate = (date, time = null) => parseIsoWeekDate(date)
  ?? parseQuarterDate(date)
  ?? parseLocalDateTime(date, time)

export const getAggregationDateInterval = date => {
  const start = parseAggregationDate(date)
  if (!start) {
    return null
  }

  let endExclusive
  if (/^\d{4}-W\d{2}$/.test(date)) {
    endExclusive = addCalendarDays(start, 7)
  } else if (/^\d{4}-Q[1-4]$/.test(date)) {
    endExclusive = new Date(start.getFullYear(), start.getMonth() + 3, 1)
  } else if (/^\d{4}-\d{2}$/.test(date)) {
    endExclusive = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  } else if (/^\d{4}$/.test(date)) {
    endExclusive = new Date(start.getFullYear() + 1, 0, 1)
  } else {
    endExclusive = addCalendarDays(start, 1)
  }

  return {start, endExclusive}
}

export const aggregationDateOverlapsRange = (date, range) => {
  const interval = getAggregationDateInterval(date)
  if (!interval) {
    return false
  }

  if (!range?.start || !range?.end) {
    return true
  }

  // The UI range has inclusive day bounds; convert its end to an exclusive boundary.
  const rangeEndExclusive = addCalendarDays(range.end, 1)
  return interval.start < rangeEndExclusive && interval.endExclusive > range.start
}

/**
 * Keep partial aggregation buckets visible when their calendar start precedes
 * the exact selected range (for example an ISO week starting in November for
 * a range beginning on 1 December).
 */
export const clampAggregationDateToRange = (date, range) => {
  const interval = getAggregationDateInterval(date)
  if (!interval) {
    return null
  }

  if (range?.start && interval.start < range.start && interval.endExclusive > range.start) {
    return new Date(range.start)
  }

  return interval.start
}
