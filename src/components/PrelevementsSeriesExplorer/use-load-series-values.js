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

/**
 * Loads series values for selected parameters and periods
 * @param {Object} params - Parameters object
 * @param {Array} params.seriesList - Array of series metadata
 * @param {Array} params.selectedPeriods - Selected time periods
 * @param {Array<string>} params.selectedParams - Selected parameter names
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
        // Find series IDs for selected parameters
        const seriesToLoad = selectedParams
          .map(paramName => seriesList.find(s => s.parameter === paramName))
          .filter(Boolean)

        // Load values for each series in parallel
        const valuesPromises = seriesToLoad.map(async serie => {
          const result = await getSeriesValues(serie._id, {
            start: format(dateRange.start, 'yyyy-MM-dd'),
            end: format(dateRange.end, 'yyyy-MM-dd')
          })
          return {seriesId: serie._id, parameter: serie.parameter, values: result?.values ?? []}
        })

        const results = await Promise.all(valuesPromises)

        if (!cancelled) {
          const valuesMap = {}
          for (const result of results) {
            valuesMap[result.parameter] = result.values
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

    const ensureDailyEntry = date => {
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          values: Array.from({length: parametersCount}, () => null)
        })
      }

      return dailyMap.get(date)
    }

    const registerTimelineEntry = (date, sample) => {
      if (!timelineEntriesByDate.has(date)) {
        timelineEntriesByDate.set(date, [])
      }

      timelineEntriesByDate.get(date).push(sample)
    }

    const ensureTimelineEntry = (date, time) => {
      const key = `${date}::${time ?? ''}`
      if (!timelineMap.has(key)) {
        const timestamp = time
          ? new Date(`${date}T${time}:00`)
          : new Date(date)

        const sample = {
          date,
          time: time ?? null,
          timestamp,
          values: Array.from({length: parametersCount}, () => null)
        }

        timelineMap.set(key, sample)
        registerTimelineEntry(date, sample)
      }

      return timelineMap.get(key)
    }

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

    const assignSubDailyFromObject = (date, subValues, paramIndex) => {
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

        const sample = ensureTimelineEntry(date, time)
        sample.values[paramIndex] = numericValue
        sum += numericValue
        count++
      }

      if (count > 0) {
        const dailyEntry = ensureDailyEntry(date)
        dailyEntry.values[paramIndex] = sum / count
      }
    }

    const assignSubDailyValues = (date, subValues, paramIndex) => {
      if (!Array.isArray(subValues)) {
        return assignSubDailyFromObject(date, subValues, paramIndex)
      }

      let sum = 0
      let count = 0

      for (const entry of subValues) {
        const numericValue = toFiniteNumber(entry?.value)
        if (numericValue === null) {
          continue
        }

        const sample = ensureTimelineEntry(date, entry.time ?? null)
        sample.values[paramIndex] = numericValue
        sum += numericValue
        count++
      }

      if (count > 0) {
        const dailyEntry = ensureDailyEntry(date)
        dailyEntry.values[paramIndex] = sum / count
      }
    }

    for (const [paramIndex, parameter] of selectedParams.entries()) {
      const values = loadedValues[parameter] ?? []

      for (const dayEntry of values) {
        if (!dayEntry || !dayEntry.date) {
          continue
        }

        const directValue = toFiniteNumber(dayEntry.value)

        if (directValue !== null) {
          const dailyEntry = ensureDailyEntry(dayEntry.date)
          dailyEntry.values[paramIndex] = directValue

          const sample = ensureTimelineEntry(dayEntry.date, null)
          sample.values[paramIndex] = directValue
          continue
        }

        if (dayEntry.values) {
          assignSubDailyValues(dayEntry.date, dayEntry.values, paramIndex)
        }
      }
    }

    for (const dailyEntry of dailyMap.values()) {
      const timelineEntries = timelineEntriesByDate.get(dailyEntry.date)
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
