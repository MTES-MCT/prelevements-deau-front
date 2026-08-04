import {getFrequencyOrder} from '@/utils/frequency.js'

export const DEFAULT_SERIES_DISPLAY_FREQUENCY = '1 day'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const WEEK_IN_DAYS = 7
const MONTH_IN_DAYS = 30
const QUARTER_IN_DAYS = 90
const MIN_TARGET_POINTS = 180
const MAX_TARGET_POINTS = 500
const MAX_DAILY_POINTS = 200
const PX_PER_TARGET_POINT = 3

function hasValidRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return false
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start
}

function getRangeDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return Math.ceil((end.getTime() - start.getTime()) / DAY_IN_MS)
}

function getTargetPoints(widthPx) {
  if (!Number.isFinite(widthPx) || widthPx <= 0) {
    return MIN_TARGET_POINTS
  }

  return Math.min(
    MAX_TARGET_POINTS,
    Math.max(MIN_TARGET_POINTS, Math.floor(widthPx / PX_PER_TARGET_POINT))
  )
}

export function normalizeSeriesDisplayFrequency(frequency) {
  if (!frequency) {
    return DEFAULT_SERIES_DISPLAY_FREQUENCY
  }

  return getFrequencyOrder(frequency) < getFrequencyOrder(DEFAULT_SERIES_DISPLAY_FREQUENCY)
    ? DEFAULT_SERIES_DISPLAY_FREQUENCY
    : frequency
}

export function resolveInitialDisplayFrequency({
  endDate,
  startDate,
  widthPx = 1200
} = {}) {
  if (!hasValidRange(startDate, endDate)) {
    return DEFAULT_SERIES_DISPLAY_FREQUENCY
  }

  const rangeDays = getRangeDays(startDate, endDate)
  const targetPoints = getTargetPoints(widthPx)
  const daysPerPoint = rangeDays / targetPoints
  const maxDailyPoints = Math.min(MAX_DAILY_POINTS, targetPoints)

  // A daily split makes cumulative volumes unnecessarily small on ranges close
  // to a year, even when a wide screen could technically fit every day. Keep
  // the daily view for shorter ranges, then favour weekly buckets before
  // considering a month.
  if (rangeDays <= maxDailyPoints) {
    return DEFAULT_SERIES_DISPLAY_FREQUENCY
  }

  if (daysPerPoint <= WEEK_IN_DAYS) {
    return '1 week'
  }

  if (daysPerPoint <= MONTH_IN_DAYS) {
    return '1 month'
  }

  if (daysPerPoint <= QUARTER_IN_DAYS) {
    return '1 quarter'
  }

  return '1 year'
}

export function resolveSeriesDisplayFrequency({
  endDate,
  startDate,
  suggestedFrequency,
  widthPx
} = {}) {
  const rangeFrequency = resolveInitialDisplayFrequency({
    endDate,
    startDate,
    widthPx
  })
  const normalizedSuggestedFrequency = normalizeSeriesDisplayFrequency(suggestedFrequency)

  return getFrequencyOrder(normalizedSuggestedFrequency) > getFrequencyOrder(rangeFrequency)
    ? rangeFrequency
    : normalizedSuggestedFrequency
}
