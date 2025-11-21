/**
 * Shared helpers to transform loaded series values into calendar/timeline data.
 */

import {coerceNumericValue} from '@/utils/number.js'
import {parseLocalDateTime} from '@/utils/time.js'

// Create or return the daily aggregation entry backing the calendar view.
const getOrCreateDailyEntry = (context, date) => {
  const {dailyMap, parametersCount} = context
  if (!dailyMap.has(date)) {
    dailyMap.set(date, {
      date,
      values: Array.from({length: parametersCount}, () => null)
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

  const timestamp = parseLocalDateTime(date, time ?? null)
  if (!timestamp) {
    return null
  }

  const sample = {
    date,
    time,
    timestamp,
    values: Array.from({length: parametersCount}, () => null)
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

      if (directValue !== null) {
        const dailyEntry = getOrCreateDailyEntry(aggregationContext, dayEntry.date)
        dailyEntry.values[paramIndex] = directValue

        const sample = getOrCreateTimelineEntry(aggregationContext, {date: dayEntry.date, time: null})
        if (sample) {
          sample.values[paramIndex] = directValue
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
