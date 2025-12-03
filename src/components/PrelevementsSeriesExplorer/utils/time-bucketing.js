/**
 * Generic time bucketing / downsampling helpers for time series.
 *
 * The goal is to pick an adequate display resolution based on the visible
 * range and chart width, then aggregate raw points per series while never
 * going finer than the native resolution of that series.
 */

import {useMemo} from 'react'

import {parseFrequencyToMs} from './gap-detection.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Resolution definitions with millisecond approximations.
// Note: Month/quarter/year use fixed approximations (30/90/365 days) which may vary
// from actual calendar lengths. This is acceptable as these values are only used for
// resolution threshold calculations, not for data aggregation.
export const RESOLUTIONS = Object.freeze([
  {id: '15m', ms: 15 * 60 * 1000},
  {id: '1h', ms: 60 * 60 * 1000},
  {id: '6h', ms: 6 * 60 * 60 * 1000},
  {id: '1d', ms: DAY_MS},
  {id: '1M', ms: 30 * DAY_MS},
  {id: '1Q', ms: 90 * DAY_MS},
  {id: '1Y', ms: 365 * DAY_MS}
])

const RESOLUTION_MS_MAP = new Map(RESOLUTIONS.map(item => [item.id, item.ms]))
const RESOLUTION_ORDER = RESOLUTIONS.map(item => item.id)

const DEFAULT_WIDTH_PX = 1200
// Reduced MIN_POINTS and increased PX_PER_POINT to prefer coarser resolutions
// for better readability (e.g., monthly instead of daily for ~10 months of data)
const MIN_POINTS = 12
const PX_PER_POINT = 15

const RESOLUTION_TO_FREQUENCY = {
  '15m': '15 minutes',
  '1h': '1 hour',
  '6h': '6 hours',
  '1d': '1 day',
  '1M': '1 month',
  '1Q': '1 quarter',
  '1Y': '1 year'
}

const toDate = value => {
  if (value instanceof Date) {
    return value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeTimeRange = (timeRange, series) => {
  if (timeRange?.start && timeRange?.end && timeRange.end > timeRange.start) {
    return timeRange
  }

  let min = null
  let max = null

  for (const item of series ?? []) {
    for (const point of item?.data ?? []) {
      const date = toDate(point?.t ?? point?.x ?? point?.timestamp ?? point?.date)
      if (!date) {
        continue
      }

      if (!min || date < min) {
        min = date
      }

      if (!max || date > max) {
        max = date
      }
    }
  }

  if (min && max && max > min) {
    return {start: min, end: max}
  }

  return null
}

const resolutionToMs = resolution => RESOLUTION_MS_MAP.get(resolution) ?? RESOLUTIONS[0].ms

// Minimum date range required to enable specific resolutions
// These thresholds ensure we have enough data points to make the resolution meaningful
// Month: > 3 months (to have at least 3 monthly points)
// Quarter: > 9 months (to have at least 3 quarterly points)
// Year: > 3 years (to have at least 3 yearly points)
const MONTHS_3_MS = 3 * 30 * DAY_MS // ~90 days
const MONTHS_9_MS = 9 * 30 * DAY_MS // ~270 days
const YEARS_3_MS = 3 * 365 * DAY_MS // ~1095 days

/**
 * Filter resolutions based on the date range duration.
 * - Month (1M) requires > 3 months of data
 * - Quarter (1Q) requires > 9 months of data
 * - Year (1Y) requires > 3 years of data
 *
 * @param {number|null} rangeMs - Duration of the date range in milliseconds
 * @returns {Array} Filtered list of resolutions
 */
const getAvailableResolutions = rangeMs => {
  if (!rangeMs || rangeMs <= 0) {
    return RESOLUTIONS
  }

  return RESOLUTIONS.filter(entry => {
    // Month resolution requires more than 3 months of data
    if (entry.id === '1M' && rangeMs <= MONTHS_3_MS) {
      return false
    }

    // Quarter resolution requires more than 9 months of data
    if (entry.id === '1Q' && rangeMs <= MONTHS_9_MS) {
      return false
    }

    // Year resolution requires more than 3 years of data
    if (entry.id === '1Y' && rangeMs <= YEARS_3_MS) {
      return false
    }

    return true
  })
}

const pickResolutionByMs = (targetMs, rangeMs = null) => {
  if (!Number.isFinite(targetMs) || targetMs <= 0) {
    return RESOLUTIONS[0].id
  }

  const availableResolutions = getAvailableResolutions(rangeMs)

  for (const entry of availableResolutions) {
    if (entry.ms >= targetMs) {
      return entry.id
    }
  }

  return availableResolutions.at(-1)?.id ?? RESOLUTIONS.at(-1).id
}

export const resolutionFromFrequency = frequency => {
  const frequencyMs = parseFrequencyToMs(frequency)
  if (!frequencyMs) {
    return null
  }

  return pickResolutionByMs(frequencyMs)
}

export const resolutionToFrequency = resolution =>
  RESOLUTION_TO_FREQUENCY[resolution] ?? RESOLUTION_TO_FREQUENCY[RESOLUTION_ORDER[0]]

export const chooseDisplayResolution = (rangeStart, rangeEnd, widthPx = DEFAULT_WIDTH_PX) => {
  const start = toDate(rangeStart)
  const end = toDate(rangeEnd)

  if (!start || !end || end <= start) {
    return RESOLUTION_ORDER[0]
  }

  const rangeMs = end.getTime() - start.getTime()
  const maxPoints = Math.max(MIN_POINTS, Math.floor(widthPx / PX_PER_POINT))
  const targetBucketMs = rangeMs / maxPoints

  return pickResolutionByMs(Math.max(targetBucketMs, RESOLUTIONS[0].ms), rangeMs)
}

export const chooseSeriesBucketResolution = (displayResolution, nativeResolution) => {
  const displayMs = resolutionToMs(displayResolution)
  const nativeMs = resolutionToMs(nativeResolution)
  const effectiveMs = Math.max(displayMs, nativeMs)

  return pickResolutionByMs(effectiveMs)
}

export const floorToBucket = (date, resolution) => {
  const resolved = toDate(date)
  if (!resolved) {
    return null
  }

  const resolutionId = RESOLUTION_MS_MAP.has(resolution) ? resolution : RESOLUTION_ORDER[0]

  switch (resolutionId) {
    case '15m': {
      const minutes = Math.floor(resolved.getMinutes() / 15) * 15
      return new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), resolved.getHours(), minutes, 0, 0)
    }

    case '1h': {
      return new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), resolved.getHours(), 0, 0, 0)
    }

    case '6h': {
      const hour6Block = Math.floor(resolved.getHours() / 6) * 6
      return new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), hour6Block, 0, 0, 0)
    }

    case '1d': {
      return new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), 0, 0, 0, 0)
    }

    case '1M': {
      return new Date(resolved.getFullYear(), resolved.getMonth(), 1, 0, 0, 0, 0)
    }

    case '1Q': {
      const quarterStartMonth = Math.floor(resolved.getMonth() / 3) * 3
      return new Date(resolved.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0)
    }

    case '1Y': {
      return new Date(resolved.getFullYear(), 0, 1, 0, 0, 0, 0)
    }

    default: {
      return new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), 0, 0, 0, 0)
    }
  }
}

const buildAccumulator = bucketStart => ({
  bucketStart,
  count: 0,
  sum: 0,
  min: Number.POSITIVE_INFINITY,
  max: Number.NEGATIVE_INFINITY,
  metaComments: []
})

const isValidPoint = (point, timeRange) => {
  const date = toDate(point?.t ?? point?.x ?? point?.timestamp ?? point?.date)
  const value = point?.value ?? point?.y

  if (!date || value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  if (timeRange?.start && date < timeRange.start) {
    return null
  }

  if (timeRange?.end && date > timeRange.end) {
    return null
  }

  return {date, value}
}

export const aggregateSeriesIntoBuckets = (points, {
  bucketResolution,
  timeRange,
  kind = 'instant'
}) => {
  if (!Array.isArray(points) || points.length === 0) {
    return []
  }

  const resolutionId = RESOLUTION_MS_MAP.has(bucketResolution) ? bucketResolution : RESOLUTION_ORDER[0]
  const buckets = new Map()

  for (const point of points) {
    const validated = isValidPoint(point, timeRange)
    if (!validated) {
      continue
    }

    const {date, value} = validated
    const bucketStart = floorToBucket(date, resolutionId)
    if (!bucketStart) {
      continue
    }

    const key = bucketStart.getTime()
    if (!buckets.has(key)) {
      buckets.set(key, buildAccumulator(bucketStart))
    }

    const acc = buckets.get(key)
    acc.count++
    acc.sum += value
    acc.min = Math.min(acc.min, value)
    acc.max = Math.max(acc.max, value)

    const comment = point?.meta?.comment
    if (typeof comment === 'string' && comment.trim()) {
      acc.metaComments.push(comment.trim())
    }
  }

  const bucketed = []

  for (const acc of buckets.values()) {
    if (acc.count === 0) {
      continue
    }

    const uniqueComments = []
    const seenComments = new Set()
    for (const comment of acc.metaComments) {
      if (!seenComments.has(comment)) {
        seenComments.add(comment)
        uniqueComments.push(comment)
      }

      if (uniqueComments.length >= 10) {
        break
      }
    }

    const basePoint = {
      t: acc.bucketStart,
      value: kind === 'cumulative' ? acc.sum : acc.sum / acc.count,
      min: acc.min,
      max: acc.max,
      count: acc.count
    }

    if (uniqueComments.length > 0) {
      basePoint.meta = {comment: uniqueComments.join(' • ')}
    }

    bucketed.push(basePoint)
  }

  return bucketed.sort((a, b) => a.t.getTime() - b.t.getTime())
}

export const bucketSeriesCollection = (series, timeRange, widthPx = DEFAULT_WIDTH_PX) => {
  const normalizedRange = normalizeTimeRange(timeRange, series)
  const displayResolution = normalizedRange
    ? chooseDisplayResolution(normalizedRange.start, normalizedRange.end, widthPx)
    : RESOLUTION_ORDER[0]

  const bucketedSeries = (series ?? []).map(serie => {
    const nativeResolution = serie?.meta?.nativeResolution
      ?? resolutionFromFrequency(serie?.meta?.nativeFrequency ?? serie?.meta?.frequency)
      ?? displayResolution

    const bucketResolution = chooseSeriesBucketResolution(
      displayResolution,
      nativeResolution
    )

    const data = aggregateSeriesIntoBuckets(serie?.data ?? [], {
      bucketResolution,
      timeRange: normalizedRange,
      kind: serie?.meta?.kind ?? 'instant'
    })

    return {
      id: serie?.id,
      data,
      bucketResolution,
      meta: serie?.meta ?? {}
    }
  }).filter(item => Array.isArray(item.data))

  return {
    bucketedSeries,
    displayResolution
  }
}

export const useBucketedSeries = (series, timeRange, widthPx) => useMemo(
  () => bucketSeriesCollection(series, timeRange, widthPx),
  // We intentionally exclude the timeRange object itself from the dependency array
  // and only include its start and end properties. This avoids unnecessary recomputation
  // when the timeRange reference changes but its relevant properties remain the same.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [series, timeRange?.start, timeRange?.end, widthPx]
)
