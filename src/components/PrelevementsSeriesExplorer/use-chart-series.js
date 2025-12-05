/**
 * Custom hook for preparing chart series data
 *
 * Note: Client-side bucketing has been disabled. Data from the API is passed
 * directly to the chart without re-aggregation. The backend handles aggregation
 * via getAggregatedSeries, and users can no longer manually choose frequency,
 * so there's no risk of overloading the UI with too many data points.
 */

import {useMemo} from 'react'

import {FALLBACK_PARAMETER_COLOR} from './constants/colors.js'
import {processTimeSeriesData} from './utils/gap-detection.js'
import {isCumulativeValueType} from './utils/parameter-display.js'
import {
  resolutionFromFrequency,
  resolutionToFrequency
} from './utils/time-bucketing.js'

import {getSmallestFrequency} from '@/utils/frequency.js'

/**
 * Transforms loaded values into chart-ready series format
 *
 * @param {Object} config - Configuration object
 * @param {boolean} config.showChart - Whether chart is visible
 * @param {Array} config.timelineSamples - All timeline samples
 * @param {Array} config.visibleSamples - Timeline samples within range
 * @param {Array<string>} config.selectedParams - Selected parameterLabels
 * @param {Map} config.parameterMap - Parameter metadata map (keyed by parameterLabel)
 * @returns {Object} Object containing { series: Array, smallestFrequency: string|null }
 */
export function useChartSeries({
  showChart,
  timelineSamples,
  visibleSamples,
  selectedParams,
  parameterMap
}) {
  return useMemo(() => {
    if (!showChart || selectedParams.length === 0) {
      return {series: [], smallestFrequency: null}
    }

    const hasTimelineData = Array.isArray(timelineSamples) && timelineSamples.length > 0
    const hasVisibleData = Array.isArray(visibleSamples) && visibleSamples.length > 0

    if (!hasTimelineData || !hasVisibleData) {
      return {series: [], smallestFrequency: null}
    }

    const selectedParamsData = selectedParams
      .map(paramLabel => parameterMap.get(paramLabel))
      .filter(Boolean)

    if (selectedParamsData.length === 0) {
      return {series: [], smallestFrequency: null}
    }

    const uniqueUnits = [...new Set(selectedParamsData.map(param => param.unit).filter(Boolean))]
    const unitToAxis = new Map()
    if (uniqueUnits[0]) {
      unitToAxis.set(uniqueUnits[0], 'left')
    }

    if (uniqueUnits[1]) {
      unitToAxis.set(uniqueUnits[1], 'right')
    }

    // Collect all frequencies to determine the smallest one
    const seriesFrequencies = []

    // Build chart series directly from visible samples without client-side bucketing
    const series = selectedParams.map((paramLabel, paramIndex) => {
      const param = parameterMap.get(paramLabel)
      if (!param) {
        return null
      }

      const axis = param.unit && unitToAxis.has(param.unit)
        ? unitToAxis.get(param.unit)
        : 'left'

      const color = param.color ?? FALLBACK_PARAMETER_COLOR
      const label = param.unit ? `${param.parameterLabel} (${param.unit})` : param.parameterLabel
      const nativeResolution = param.nativeResolution ?? resolutionFromFrequency(param.frequency)
      // Fallback to param.frequency which is already in human-readable format (e.g., '1 day')
      // compatible with processTimeSeriesData's parseFrequencyToMs function
      const nativeFrequency = resolutionToFrequency(nativeResolution) ?? param.frequency

      // Collect frequency for determining smallest
      if (nativeFrequency) {
        seriesFrequencies.push(nativeFrequency)
      }

      // Transform data points to chart format
      const rawData = visibleSamples
        .map(sample => {
          const value = sample.values?.[paramIndex]
          if (value === null || value === undefined || Number.isNaN(value)) {
            return null
          }

          const timestamp = sample.timestamp instanceof Date
            ? sample.timestamp
            : new Date(sample.timestamp)

          const meta = sample.metas?.[paramIndex] ?? null

          return {
            x: timestamp,
            y: value,
            meta
          }
        })
        .filter(Boolean)

      if (rawData.length === 0) {
        return null
      }

      // Apply gap detection based on native frequency (no re-aggregation)
      const processedData = nativeFrequency
        ? processTimeSeriesData(rawData, nativeFrequency)
        : rawData

      return {
        id: param.parameterLabel,
        label,
        axis,
        color,
        data: processedData,
        type: isCumulativeValueType(param.valueType) ? 'bar' : 'line',
        nativeResolution,
        frequency: nativeFrequency
      }
    }).filter(Boolean)

    // Determine the smallest frequency among all series
    const smallestFrequency = getSmallestFrequency(seriesFrequencies)

    return {series, smallestFrequency}
  }, [
    showChart,
    timelineSamples,
    visibleSamples,
    selectedParams,
    parameterMap
  ])
}
