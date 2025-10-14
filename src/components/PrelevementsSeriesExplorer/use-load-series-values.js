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
 * @returns {Object} Loading state, loaded values, and daily values
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

  // Build daily values from loaded data
  // Format: {date, values: [v1, v2, ...]} where array index matches parameter order
  const dailyValues = useMemo(() => {
    if (Object.keys(loadedValues).length === 0) {
      return []
    }

    // Get all unique dates from all loaded series
    const dateMap = new Map()
    const parametersList = Object.keys(loadedValues)

    for (const [parameter, values] of Object.entries(loadedValues)) {
      for (const dayEntry of values) {
        if (!dateMap.has(dayEntry.date)) {
          dateMap.set(dayEntry.date, {
            date: dayEntry.date,
            values: Array.from({length: parametersList.length}, () => null)
          })
        }

        const entry = dateMap.get(dayEntry.date)
        const paramIndex = parametersList.indexOf(parameter)

        // API format: {date, value, remark?}
        // Value can be a number, 0, or null
        entry.values[paramIndex] = dayEntry.value ?? null
      }
    }

    // Convert map to array and sort by date
    return [...dateMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date))
  }, [loadedValues])

  return {
    loadedValues,
    isLoadingValues,
    loadError,
    dailyValues
  }
}
