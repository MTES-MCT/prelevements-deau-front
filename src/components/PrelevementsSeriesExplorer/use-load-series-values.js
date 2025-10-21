/**
 * Custom hook to load series values based on selected periods and parameters
 *
 * Handles both daily and sub-daily series:
 * - Daily series: values have `value` property (number)
 * - Sub-daily series: values have `values` property (object with time keys like "00:00", "15:00")
 *
 * Sub-daily values are automatically aggregated to daily averages for display.
 */

import {useEffect, useState, useMemo} from 'react'

import {format} from 'date-fns'

import {
  indexDuplicateParameters,
  parseLocalDateTime
} from './util.js'

// Coerce any input to a finite number; invalid or infinite values become null.
const toFiniteNumber = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

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

// Keep a list of timeline samples for each day so we can backfill sub-daily entries.
const registerTimelineEntry = (context, date, sample) => {
  const {timelineEntriesByDate} = context
  if (!timelineEntriesByDate.has(date)) {
    timelineEntriesByDate.set(date, [])
  }

  timelineEntriesByDate.get(date).push(sample)
}

// Lazily build a timestamped sample (potentially sub-daily) and register it in the context.
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
  registerTimelineEntry(context, date, sample)

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
    const numericValue = toFiniteNumber(value)
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
    const numericValue = toFiniteNumber(entry?.value)
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
 * Loads series values for selected parameters and periods
 * @param {Object} params - Parameters object
 * @param {Array} params.seriesList - Array of series metadata
 * @param {Array} params.selectedPeriods - Selected time periods
 * @param {Array<string>} params.selectedParams - Selected parameterLabels
 * @param {Object} params.dateRange - Date range with start and end dates
 * @param {Function} params.getSeriesValues - Function to fetch series values from API
 *   Expected signature: (seriesId: string, {start: string, end: string}) => Promise<{values: Array}>
 * @returns {Object} Loading state, loaded values, daily aggregates, and timeline samples
 */
export function useLoadSeriesValues({seriesList, selectedPeriods, selectedParams, dateRange, getSeriesValues}) {
  const [loadedValues, setLoadedValues] = useState({})
  const [isLoadingValues, setIsLoadingValues] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Load series values when periods and parameters change
  useEffect(() => {
    if (selectedPeriods.length === 0 || selectedParams.length === 0 || !dateRange) {
      setLoadedValues({})
      return
    }

    let cancelled = false
    const loadValues = async () => {
      setIsLoadingValues(true)
      setLoadError(null)

      try {
        // Build index of series by parameterLabel (handling duplicates)
        const indexedSeries = indexDuplicateParameters(seriesList)

        // Find series by parameterLabel
        const seriesToLoad = selectedParams
          .map(paramLabel => indexedSeries.find(s => s.parameterLabel === paramLabel))
          .filter(Boolean)

        // Load values for each series in parallel
        const valuesPromises = seriesToLoad.map(async serie => {
          const result = await getSeriesValues(serie._id, {
            start: format(dateRange.start, 'yyyy-MM-dd'),
            end: format(dateRange.end, 'yyyy-MM-dd')
          })
          return {parameterLabel: serie.parameterLabel, values: result?.values ?? []}
        })

        const results = await Promise.all(valuesPromises)

        if (!cancelled) {
          const valuesMap = {}
          for (const result of results) {
            valuesMap[result.parameterLabel] = result.values
          }

          setLoadedValues(valuesMap)
          setIsLoadingValues(false)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Erreur lors du chargement des données')
          setIsLoadingValues(false)
        }
      }
    }

    loadValues()

    return () => {
      cancelled = true
    }
  }, [selectedPeriods, selectedParams, dateRange, seriesList, getSeriesValues])

  // Build timeline samples from loaded data alongside daily aggregates (for calendar visuals)
  const {dailyValues, timelineSamples} = useMemo(() => {
    if (Object.keys(loadedValues).length === 0 || selectedParams.length === 0) {
      return {
        dailyValues: [],
        timelineSamples: []
      }
    }

    const parametersCount = selectedParams.length

    const dailyMap = new Map()
    const timelineMap = new Map()
    const timelineEntriesByDate = new Map()
    const aggregationContext = {
      parametersCount,
      dailyMap,
      timelineMap,
      timelineEntriesByDate
    }

    for (const [paramIndex, paramLabel] of selectedParams.entries()) {
      const values = loadedValues[paramLabel] ?? []

      // Iterate over daily API entries, handling both direct daily and sub-daily values.
      for (const dayEntry of values) {
        if (!dayEntry || !dayEntry.date) {
          continue
        }

        const directValue = toFiniteNumber(dayEntry.value)

        if (directValue !== null) {
          const dailyEntry = getOrCreateDailyEntry(aggregationContext, dayEntry.date)
          dailyEntry.values[paramIndex] = directValue

          const sample = getOrCreateTimelineEntry(aggregationContext, {date: dayEntry.date, time: null})
          if (sample) {
            // Mirror the daily value onto the timeline to ensure the chart renders when no sub-daily data exist.
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

    for (const dailyEntry of dailyMap.values()) {
      const timelineEntries = timelineEntriesByDate.get(dailyEntry.date)
      // Backfill missing sub-daily samples with the averaged daily value to keep each parameter populated.
      if (!timelineEntries) {
        continue
      }

      for (const sample of timelineEntries) {
        for (const [index, dailyValue] of dailyEntry.values.entries()) {
          if (dailyValue === null || sample.values[index] !== null) {
            continue
          }

          sample.values[index] = dailyValue
        }
      }
    }

    const dailyValuesResult = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date))
    const timelineSamplesResult = [...timelineMap.values()].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return {
      dailyValues: dailyValuesResult,
      timelineSamples: timelineSamplesResult
    }
  }, [loadedValues, selectedParams])

  return {
    loadedValues,
    isLoadingValues,
    loadError,
    dailyValues,
    timelineSamples
  }
}
