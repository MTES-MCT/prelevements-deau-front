/**
 * Registry mapping value types to chart components.
 */

import TimeSeriesAreaChart from '@/components/ui/TimeSeriesAreaChart/index.js'
import TimeSeriesBandChart from '@/components/ui/TimeSeriesBandChart/index.js'
import TimeSeriesBarChart from '@/components/ui/TimeSeriesBarChart/index.js'
import TimeSeriesChart from '@/components/ui/TimeSeriesChart/index.js'

export const DEFAULT_CHART_COMPONENT = TimeSeriesChart

const VALUE_TYPE_CHART_COMPONENTS = new Map([
  ['cumulative', TimeSeriesBarChart],
  ['instantaneous', TimeSeriesChart],
  ['average', TimeSeriesAreaChart],
  ['minimum', TimeSeriesChart],
  ['maximum', TimeSeriesChart],
  ['median', TimeSeriesChart],
  ['delta-index', TimeSeriesBarChart],
  ['raw', TimeSeriesChart]
])

/**
 * Resolve a chart component for a specific value type.
 * Falls back to the default component when none is registered.
 *
 * @param {string} valueType - Series value type identifier
 * @returns {React.ComponentType} Chart component to render
 */
export function getChartComponentForValueType(valueType) {
  if (!valueType) {
    return DEFAULT_CHART_COMPONENT
  }

  return VALUE_TYPE_CHART_COMPONENTS.get(valueType) ?? DEFAULT_CHART_COMPONENT
}

/**
 * Resolve the most appropriate chart component for a list of value types.
 * Currently returns the first matching component, otherwise the default one.
 *
 * @param {Array<string>} valueTypes - Ordered list of value types to inspect
 * @returns {React.ComponentType} Chart component to render
 */
export function resolveChartComponentForValueTypes(valueTypes = []) {
  const uniqueTypes = [...new Set(valueTypes.filter(Boolean))]

  if (uniqueTypes.length === 0) {
    return DEFAULT_CHART_COMPONENT
  }

  if (uniqueTypes.includes('minimum') && uniqueTypes.includes('maximum')) {
    return TimeSeriesBandChart
  }

  if (uniqueTypes.includes('cumulative')) {
    return TimeSeriesBarChart
  }

  if (uniqueTypes.includes('delta-index')) {
    return TimeSeriesBarChart
  }

  if (uniqueTypes.includes('average')) {
    return TimeSeriesAreaChart
  }

  for (const valueType of uniqueTypes) {
    const component = VALUE_TYPE_CHART_COMPONENTS.get(valueType)
    if (component) {
      return component
    }
  }

  return DEFAULT_CHART_COMPONENT
}

export {VALUE_TYPE_CHART_COMPONENTS}
