/**
 * Shared helpers to transform loaded series values into calendar/timeline data.
 */

import {parseQuarterDate} from '@/lib/format-date.js'
import {coerceNumericValue} from '@/utils/number.js'
import {parseLocalDateTime} from '@/utils/time.js'

// Normalize remarks (string or array) into a single comment string suitable for chart metadata.
const normalizeMetaComment = entry => {
  if (!entry) {
    return null
  }

  const collected = []

  if (typeof entry.remark === 'string' && entry.remark.trim()) {
    collected.push(entry.remark.trim())
  }

  if (Array.isArray(entry.remarks)) {
    for (const remark of entry.remarks) {
      if (typeof remark === 'string' && remark.trim()) {
        collected.push(remark.trim())
      }
    }
  }

  if (collected.length === 0) {
    return null
  }

  // Deduplicate in insertion order and align with backend cap (10).
  const seen = new Set()
  const unique = []
  for (const remark of collected) {
    if (!seen.has(remark)) {
      seen.add(remark)
      unique.push(remark)
    }

    if (unique.length >= 10) {
      break
    }
  }

  return unique.join(' • ')
}

// Create or return the daily aggregation entry backing the calendar view.
const getOrCreateDailyEntry = (context, date) => {
  const {dailyMap, parametersCount} = context
  if (!dailyMap.has(date)) {
    dailyMap.set(date, {
      date,
      values: Array.from({length: parametersCount}, () => null),
      metas: Array.from({length: parametersCount}, () => null)
    })
  }

  return dailyMap.get(date)
}

// Lazily build a timestamped sample (potentially sub-daily) and store it in the context.
const getOrCreateTimelineEntry = (context, {date, time = null}) => {
  const {timelineMap, parametersCount} = context
  const key = `${date}::${time ?? ''}`
  const existingSample = timelineMap.get(key)
  if (existingSample) {
    return existingSample
  }

  // Handle quarter format YYYY-Q[1-4] or regular date/time
  const quarterDate = parseQuarterDate(date)
  const timestamp = quarterDate || parseLocalDateTime(date, time ?? null)

  if (!timestamp) {
    return null
  }

  const sample = {
    date,
    time,
    timestamp,
    values: Array.from({length: parametersCount}, () => null),
    metas: Array.from({length: parametersCount}, () => null)
  }

  timelineMap.set(key, sample)

  return sample
}

// Assign sub-daily values when the API returns an object keyed by HH:mm.
const assignSubDailyFromObject = ({context, date, subValues, paramIndex}) => {
  if (!subValues || typeof subValues !== 'object') {
    return
  }

  let sum = 0
  let count = 0

  for (const [time, value] of Object.entries(subValues)) {
    const numericValue = coerceNumericValue(value)
    if (numericValue === null) {
      continue
    }

    const sample = getOrCreateTimelineEntry(context, {date, time})
    if (!sample) {
      continue
    }

    sample.values[paramIndex] = numericValue
    sample.metas[paramIndex] = null
    sum += numericValue
    count++
  }

  if (count > 0) {
    // Average sub-daily points to produce the daily aggregate.
    const dailyEntry = getOrCreateDailyEntry(context, date)
    dailyEntry.values[paramIndex] = sum / count
  }
}

// Assign sub-daily values when the API returns an array of {time, value}.
const assignSubDailyValues = ({context, date, subValues, paramIndex}) => {
  if (!Array.isArray(subValues)) {
    return assignSubDailyFromObject({
      context, date, subValues, paramIndex
    })
  }

  let sum = 0
  let count = 0

  for (const entry of subValues) {
    const numericValue = coerceNumericValue(entry?.value)
    if (numericValue === null) {
      continue
    }

    const sample = getOrCreateTimelineEntry(context, {date, time: entry.time ?? null})
    if (!sample) {
      continue
    }

    sample.values[paramIndex] = numericValue
    const metaComment = normalizeMetaComment(entry)
    sample.metas[paramIndex] = metaComment ? {comment: metaComment} : null
    sum += numericValue
    count++
  }

  if (count > 0) {
    // Average sub-daily points to produce the daily aggregate.
    const dailyEntry = getOrCreateDailyEntry(context, date)
    dailyEntry.values[paramIndex] = sum / count
  }
}

/**
 * Transform a map of loaded values keyed by parameter label into
 * daily values (for calendar) and timeline samples (for charts).
 *
 * @param {Object} config
 * @param {Object<string, Array>} config.loadedValues - Map of parameterLabel -> API values
 * @param {Array<string>} config.selectedParams - Ordered list of selected parameterLabels
 * @returns {{dailyValues: Array, timelineSamples: Array}}
 */
export function buildDailyAndTimelineData({
  loadedValues,
  selectedParams
}) {
  if (
    !loadedValues
    || !selectedParams
    || selectedParams.length === 0
    || Object.keys(loadedValues).length === 0
  ) {
    return {
      dailyValues: [],
      timelineSamples: []
    }
  }

  const parametersCount = selectedParams.length

  const dailyMap = new Map()
  const timelineMap = new Map()
  const aggregationContext = {
    parametersCount,
    dailyMap,
    timelineMap
  }

  for (const [paramIndex, paramLabel] of selectedParams.entries()) {
    const values = loadedValues[paramLabel] ?? []

    for (const dayEntry of values) {
      if (!dayEntry || !dayEntry.date) {
        continue
      }

      const directValue = coerceNumericValue(dayEntry.value)
      const directMetaComment = normalizeMetaComment(dayEntry)

      if (directValue !== null) {
        const dailyEntry = getOrCreateDailyEntry(aggregationContext, dayEntry.date)
        dailyEntry.values[paramIndex] = directValue
        dailyEntry.metas[paramIndex] = directMetaComment ? {comment: directMetaComment} : null

        const sample = getOrCreateTimelineEntry(aggregationContext, {date: dayEntry.date, time: null})
        if (sample) {
          sample.values[paramIndex] = directValue
          sample.metas[paramIndex] = directMetaComment ? {comment: directMetaComment} : null
        }

        continue
      }

      if (dayEntry.values) {
        assignSubDailyValues({
          context: aggregationContext,
          date: dayEntry.date,
          subValues: dayEntry.values,
          paramIndex
        })
      }
    }
  }

  const dailyValuesResult = [...dailyMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
  const timelineSamplesResult = [...timelineMap.values()]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return {
    dailyValues: dailyValuesResult,
    timelineSamples: timelineSamplesResult
  }
}
