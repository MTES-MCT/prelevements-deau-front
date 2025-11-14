/**
 * Custom hook for preparing chart series data
 */

import {useMemo} from 'react'

import {FALLBACK_PARAMETER_COLOR} from './constants/colors.js'
import {processTimeSeriesData} from './utils/gap-detection.js'

/**
 * Transforms loaded values into chart-ready series format
 *
 * @param {Object} config - Configuration object
 * @param {boolean} config.showChart - Whether chart is visible
 * @param {Array} config.timelineSamples - All timeline samples
 * @param {Array} config.visibleSamples - Timeline samples within range
 * @param {Array<string>} config.selectedParams - Selected parameterLabels
 * @param {Map} config.parameterMap - Parameter metadata map (keyed by parameterLabel)
 * @returns {Array} Chart series data
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

    return selectedParams.map((paramLabel, paramIndex) => {
      const param = parameterMap.get(paramLabel)
      if (!param) {
        return null
      }

      const data = []

      for (const sample of visibleSamples) {
        const y = sample.values?.[paramIndex] ?? null
        if (y !== null) {
          data.push({
            x: sample.timestamp instanceof Date ? sample.timestamp : new Date(sample.timestamp),
            y
          })
        }
      }

      if (data.length === 0) {
        return null
      }

      // Apply gap detection to break line continuity when temporal gaps are significant
      // and mark segment boundaries (first/last points) for visible markers
      const {frequency} = param
      const processedData = frequency ? processTimeSeriesData(data, frequency) : data

      const axis = param.unit && unitToAxis.has(param.unit)
        ? unitToAxis.get(param.unit)
        : 'left'

      const color = param.color ?? FALLBACK_PARAMETER_COLOR
      const label = param.unit ? `${param.parameterLabel} (${param.unit})` : param.parameterLabel

      return {
        id: param.parameterLabel,
        label,
        axis,
        color,
        data: processedData
      }
    }).filter(Boolean)
  }, [
    showChart,
    timelineSamples,
    visibleSamples,
    selectedParams,
    parameterMap
  ])
}
