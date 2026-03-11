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

import moment from 'moment'

import {buildDailyAndTimelineData} from '@/components/PrelevementsSeriesExplorer/utils/aggregation.js'

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
        const seriesToLoad = seriesList.filter(s => selectedParams.includes(s.metricTypeCode))

        if (!cancelled) {
          const valuesMap = seriesToLoad.reduce((acc, serie) => {
            const value = {
              value: serie.value,
              date: moment(serie.date).format('YYYY-MM-DD')
            }
            acc[serie.metricTypeCode] ??= []
            acc[serie.metricTypeCode].push(value)
            return acc
          }, {})
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
