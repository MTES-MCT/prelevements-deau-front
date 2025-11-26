/**
 * Custom hook for preparing chart series data
 */

import {useMemo} from 'react'

import {FALLBACK_PARAMETER_COLOR} from './constants/colors.js'
import {processTimeSeriesData} from './utils/gap-detection.js'
import {isCumulativeValueType} from './utils/parameter-display.js'
import {
  bucketSeriesCollection,
  resolutionFromFrequency,
  resolutionToFrequency
} from './utils/time-bucketing.js'

/**
 * Transforms loaded values into chart-ready series format
 *
 * @param {Object} config - Configuration object
 * @param {boolean} config.showChart - Whether chart is visible
 * @param {Array} config.timelineSamples - All timeline samples
 * @param {Array} config.visibleSamples - Timeline samples within range
 * @param {Array<string>} config.selectedParams - Selected parameterLabels
 * @param {Map} config.parameterMap - Parameter metadata map (keyed by parameterLabel)
 * @param {number} [config.chartWidthPx=1200] - Available width to estimate bucket count
 * @returns {Array} Chart series data
 */
export function useChartSeries({
  showChart,
  timelineSamples,
  visibleSamples,
  selectedParams,
  parameterMap,
  chartWidthPx = 1200
}) {
  return useMemo(() => {
    if (!showChart || selectedParams.length === 0) {
      return []
    }

    const hasTimelineData = Array.isArray(timelineSamples) && timelineSamples.length > 0
    const hasVisibleData = Array.isArray(visibleSamples) && visibleSamples.length > 0

    if (!hasTimelineData || !hasVisibleData) {
      return []
    }

    const selectedParamsData = selectedParams
      .map(paramLabel => parameterMap.get(paramLabel))
      .filter(Boolean)

    if (selectedParamsData.length === 0) {
      return []
    }

    const uniqueUnits = [...new Set(selectedParamsData.map(param => param.unit).filter(Boolean))]
    const unitToAxis = new Map()
    if (uniqueUnits[0]) {
      unitToAxis.set(uniqueUnits[0], 'left')
    }

    if (uniqueUnits[1]) {
      unitToAxis.set(uniqueUnits[1], 'right')
    }

    const timeRange = (() => {
      const firstSample = visibleSamples[0]
      const lastSample = visibleSamples.at(-1)

      if (!firstSample?.timestamp || !lastSample?.timestamp) {
        return null
      }

      return {
        start: firstSample.timestamp instanceof Date
          ? firstSample.timestamp
          : new Date(firstSample.timestamp),
        end: lastSample.timestamp instanceof Date
          ? lastSample.timestamp
          : new Date(lastSample.timestamp)
      }
    })()

    const seriesInputs = selectedParams.map((paramLabel, paramIndex) => {
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
      const kind = isCumulativeValueType(param.valueType) ? 'cumulative' : 'instant'
      const data = visibleSamples
        .map(sample => {
          const value = sample.values?.[paramIndex]
          if (value === null || value === undefined || Number.isNaN(value)) {
            return null
          }

          const timestamp = sample.timestamp instanceof Date
            ? sample.timestamp
            : new Date(sample.timestamp)

          const meta = sample.metas?.[paramIndex] ?? null

          return {t: timestamp, value, meta}
        })
        .filter(Boolean)

      return {
        id: param.parameterLabel,
        axis,
        color,
        label,
        meta: {
          ...param,
          nativeResolution,
          kind
        },
        data
      }
    }).filter(Boolean)

    const {bucketedSeries} = bucketSeriesCollection(
      seriesInputs,
      timeRange,
      chartWidthPx
    )

    const bucketedById = new Map(
      bucketedSeries.map(item => [item.id, item])
    )

    return selectedParams.map(paramLabel => {
      const param = parameterMap.get(paramLabel)
      if (!param) {
        return null
      }

      const bucketed = bucketedById.get(param.parameterLabel)
      if (!bucketed || bucketed.data.length === 0) {
        return null
      }

      const axis = param.unit && unitToAxis.has(param.unit)
        ? unitToAxis.get(param.unit)
        : 'left'

      const color = param.color ?? FALLBACK_PARAMETER_COLOR
      const label = param.unit ? `${param.parameterLabel} (${param.unit})` : param.parameterLabel
      const bucketFrequency = resolutionToFrequency(bucketed.bucketResolution)
      const processedData = bucketFrequency
        ? processTimeSeriesData(
          bucketed.data.map(point => ({
            x: point.t,
            y: point.value,
            min: point.min,
            max: point.max,
            sourceCount: point.count,
            meta: point.meta ?? null
          })),
          bucketFrequency
        )
        : bucketed.data

      return {
        id: param.parameterLabel,
        label,
        axis,
        color,
        data: processedData,
        type: isCumulativeValueType(param.valueType) ? 'bar' : 'line',
        bucketResolution: bucketed.bucketResolution
      }
    }).filter(Boolean)
  }, [
    showChart,
    timelineSamples,
    visibleSamples,
    selectedParams,
    parameterMap,
    chartWidthPx
  ])
}
