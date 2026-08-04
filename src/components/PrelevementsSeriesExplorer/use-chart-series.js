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
import {getAggregationDateInterval} from './utils/aggregation-date.js'
import {processTimeSeriesData} from './utils/gap-detection.js'
import {isCumulativeValueType} from './utils/parameter-display.js'
import {
  resolutionFromFrequency,
  resolutionToFrequency
} from './utils/time-bucketing.js'

import {addCalendarIncrement, isCalendarBasedUnit, parseFrequency} from '@/utils/frequency-parsing.js'
import {getSmallestFrequency} from '@/utils/frequency.js'

const FIXED_FREQUENCY_DURATION = Object.freeze({
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000
})

const addFrequency = (date, frequency) => {
  const parsed = parseFrequency(frequency)
  if (!parsed) {
    return null
  }

  if (isCalendarBasedUnit(parsed.unit)) {
    return addCalendarIncrement(date, parsed.value, parsed.unit)
  }

  const duration = FIXED_FREQUENCY_DURATION[parsed.unit]
  return duration ? new Date(date.getTime() + (parsed.value * duration)) : null
}

const getBucketEnd = (point, frequency) => {
  if (point.bucketEnd instanceof Date && !Number.isNaN(point.bucketEnd.getTime())) {
    return point.bucketEnd
  }

  return addFrequency(point.x, frequency)
}

/**
 * Turn cumulative bucket values into horizontal display intervals.
 *
 * A cumulative value describes a whole bucket, not an instantaneous measure.
 * The extra synthetic point closes the final bucket of each continuous run so
 * an isolated daily volume is rendered over exactly one day instead of as a dot.
 */
export const expandCumulativeBucketsForDisplay = (data, frequency) => {
  const sortedData = [...data].sort((a, b) => a.x - b.x)
  const expanded = []

  for (const [index, rawPoint] of sortedData.entries()) {
    const {bucketEnd: _bucketEnd, ...point} = rawPoint
    expanded.push({...point, showMark: false})

    const endExclusive = getBucketEnd(rawPoint, frequency)
    if (!endExclusive || endExclusive <= point.x) {
      continue
    }

    const nextPoint = sortedData[index + 1]
    const nextStartsAtBucketBoundary = nextPoint
      && nextPoint.x.getTime() === endExclusive.getTime()

    if (nextStartsAtBucketBoundary) {
      continue
    }

    expanded.push({
      ...point,
      x: new Date(endExclusive.getTime() - 1),
      meta: null,
      tooltipDate: point.x,
      tooltipMeta: point.meta ?? null,
      synthetic: true,
      displayBoundary: true,
      showMark: false
    })

    // Close the covered interval explicitly before a later bucket. Detecting
    // gaps only after adding the end boundary would make a missing bucket look
    // contiguous (for example J1 23:59:59 -> J3 is only about one day apart).
    if (nextPoint && nextPoint.x > endExclusive) {
      expanded.push({
        x: new Date(endExclusive),
        y: null,
        meta: null,
        synthetic: true,
        displayBoundary: true,
        isGapPoint: true,
        showMark: false
      })
    }
  }

  return expanded
}

export const prepareCumulativeSeriesData = (data, frequency) => processTimeSeriesData(
  expandCumulativeBucketsForDisplay(data, frequency),
  frequency
).map(point => ({...point, showMark: false}))

export const shouldRenderCumulativeSeriesAsSteppedLine = parameter => (
  isCumulativeValueType(parameter?.valueType)
)

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
      const isCumulative = shouldRenderCumulativeSeriesAsSteppedLine(param)
      const curve = isCumulative ? 'stepAfter' : undefined
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
          const bucketInterval = !sample.time && isCumulativeValueType(param.valueType)
            ? getAggregationDateInterval(sample.date)
            : null

          return {
            x: timestamp,
            y: value,
            meta,
            bucketEnd: bucketInterval?.endExclusive ?? null
          }
        })
        .filter(Boolean)

      if (rawData.length === 0) {
        return null
      }

      // Apply gap detection based on native frequency (no re-aggregation)
      let processedData = rawData
      if (nativeFrequency) {
        processedData = isCumulativeValueType(param.valueType)
          ? prepareCumulativeSeriesData(rawData, nativeFrequency)
          : processTimeSeriesData(rawData, nativeFrequency)
      }

      return {
        id: param.parameterId ?? paramLabel,
        label,
        axis,
        color,
        data: processedData,
        curve,
        area: isCumulative,
        nativeResolution,
        frequency: nativeFrequency,
        precision: param.precision ?? 0
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
