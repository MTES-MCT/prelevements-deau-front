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

import {buildDailyAndTimelineData} from '@/components/PrelevementsSeriesExplorer/utils/aggregation.js'
import {
  getSeriesMetricTypeCode,
  normalizeSeriesDate,
  normalizeSeriesValueEntry
} from '@/components/PrelevementsSeriesExplorer/utils/index.js'

function hasInlineValueEntry(series) {
  return Boolean(normalizeSeriesValueEntry(series))
}

function resolveSeriesIdentifier(series) {
  if (!series) {
    return null
  }

  if (!hasInlineValueEntry(series) && series.id) {
    return series.id
  }

  const metricTypeCode = getSeriesMetricTypeCode(series)
  if (series.chunkId && metricTypeCode) {
    return `${series.chunkId}:${metricTypeCode}`
  }

  return null
}

function normalizeFetchedValues(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.values)) {
    return payload.values
  }

  if (Array.isArray(payload?.data?.values)) {
    return payload.data.values
  }

  return []
}

function isWithinDateRange(entry, dateRange) {
  if (!dateRange?.start || !dateRange?.end) {
    return true
  }

  const date = normalizeSeriesDate(entry?.date)

  if (!date) {
    return false
  }

  const startDate = normalizeSeriesDate(dateRange.start)
  const endDate = normalizeSeriesDate(dateRange.end)

  return (!startDate || date >= startDate) && (!endDate || date <= endDate)
}

function appendNormalizedValue(valuesMap, metricTypeCode, value) {
  const normalizedValue = normalizeSeriesValueEntry(value)

  if (!metricTypeCode || !normalizedValue) {
    return
  }

  valuesMap[metricTypeCode] ??= []
  valuesMap[metricTypeCode].push(normalizedValue)
}

function sortValuesMap(valuesMap) {
  return Object.fromEntries(
    Object.entries(valuesMap).map(([metricTypeCode, values]) => [
      metricTypeCode,
      [...values].sort((a, b) => a.date.localeCompare(b.date))
    ])
  )
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
        const valuesMap = {}
        const selectedSeries = seriesList.filter(series => {
          const metricTypeCode = getSeriesMetricTypeCode(series)
          return metricTypeCode && selectedParams.includes(metricTypeCode)
        })

        for (const series of selectedSeries) {
          const metricTypeCode = getSeriesMetricTypeCode(series)

          if (hasInlineValueEntry(series)) {
            const normalizedValue = normalizeSeriesValueEntry(series)

            if (isWithinDateRange(normalizedValue, dateRange)) {
              appendNormalizedValue(valuesMap, metricTypeCode, normalizedValue)
            }

            continue
          }

          const seriesId = resolveSeriesIdentifier(series)
          if (!seriesId || typeof getSeriesValues !== 'function') {
            continue
          }

          // eslint-disable-next-line no-await-in-loop
          const response = await getSeriesValues(seriesId, {
            startDate: dateRange.start,
            endDate: dateRange.end
          })

          const values = normalizeFetchedValues(response)

          for (const value of values) {
            appendNormalizedValue(valuesMap, metricTypeCode, value)
          }
        }

        if (!cancelled) {
          setLoadedValues(sortValuesMap(valuesMap))
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

  const {dailyValues, timelineSamples} = useMemo(() => buildDailyAndTimelineData({
    loadedValues,
    selectedParams
  }), [loadedValues, selectedParams])

  return {
    loadedValues,
    isLoadingValues,
    loadError,
    dailyValues,
    timelineSamples
  }
}
