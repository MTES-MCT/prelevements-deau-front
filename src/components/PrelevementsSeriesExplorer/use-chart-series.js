/**
 * Custom hook for preparing chart series data
 */

import {useMemo} from 'react'

import {format} from 'date-fns'

/**
 * Transforms loaded values into chart-ready series format
 *
 * @param {Object} config - Configuration object
 * @param {boolean} config.showChart - Whether chart is visible
 * @param {Object} config.loadedValues - Raw loaded values by series
 * @param {Array} config.visibleDateRange - Date range to display
 * @param {Array} config.dailyValues - Daily aggregated values
 * @param {Array<string>} config.selectedParams - Selected parameter names
 * @param {Map} config.parameterMap - Parameter metadata map
 * @returns {Array} Chart series data
 */
export function useChartSeries({
  showChart,
  loadedValues,
  visibleDateRange,
  dailyValues,
  selectedParams,
  parameterMap
}) {
  return useMemo(() => {
    if (!showChart || Object.keys(loadedValues).length === 0 || visibleDateRange.length === 0) {
      return []
    }

    const selectedParamsData = selectedParams
      .map(paramName => parameterMap.get(paramName))
      .filter(Boolean)

    if (selectedParamsData.length === 0) {
      return []
    }

    const dailyValuesByDate = new Map(dailyValues.map(value => [value.date, value]))

    const visibleValues = visibleDateRange
      .map(date => dailyValuesByDate.get(format(date, 'yyyy-MM-dd')))
      .filter(Boolean)

    const uniqueUnits = [...new Set(selectedParamsData.map(param => param.unit).filter(Boolean))]
    const unitToAxis = new Map()
    if (uniqueUnits[0]) {
      unitToAxis.set(uniqueUnits[0], 'left')
    }

    if (uniqueUnits[1]) {
      unitToAxis.set(uniqueUnits[1], 'right')
    }

    return selectedParams.map((paramName, paramIndex) => {
      const param = parameterMap.get(paramName)
      if (!param) {
        return null
      }

      const data = []
      for (const value of visibleValues) {
        const y = value.values[paramIndex] ?? null
        if (y !== null) {
          data.push({
            x: new Date(value.date),
            y
          })
        }
      }

      const axis = param.unit && unitToAxis.has(param.unit)
        ? unitToAxis.get(param.unit)
        : 'left'

      return {
        id: paramName,
        label: `${param.parameter} (${param.unit})`,
        axis,
        color: param.color,
        data
      }
    }).filter(Boolean)
  }, [
    showChart,
    loadedValues,
    visibleDateRange,
    dailyValues,
    selectedParams,
    parameterMap
  ])
}
