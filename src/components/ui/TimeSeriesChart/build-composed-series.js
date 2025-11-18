const DEFAULT_SERIES_TYPE = 'line'

/**
 * Compose the final list of series (line segments, bars, thresholds and legend metadata)
 * used by the chart container.
 *
 * @param {Object} params
 * @param {Array} params.stubSeries - Base series definitions (one per parameter) used for the legend.
 * @param {Array} params.segmentSeries - Line segments produced by the threshold processor.
 * @param {Array} params.dynamicThresholdSeries - Dynamic threshold series.
 * @param {number} params.xAxisLength - Number of x-axis samples (used to rebuild bar data arrays).
 * @param {Function} params.resolveSeriesType - Function returning `'bar'` or `'line'` for a given original series id.
 * @param {Function} params.resolveSeriesColor - Function returning the resolved color for a given series (handles hidden state).
 * @param {Function} params.formatBarValue - Formatter applied to bar series values.
 *
 * @returns {Object} Object containing legendSeries, lineSegments, barSeries, thresholdSeries and composedSeries.
 */
export function buildComposedSeries({
  stubSeries,
  segmentSeries,
  dynamicThresholdSeries,
  xAxisLength,
  resolveSeriesType,
  resolveSeriesColor,
  formatBarValue
}) {
  const getType = originalId => resolveSeriesType?.(originalId) ?? DEFAULT_SERIES_TYPE

  const legendSeries = stubSeries.map(stub => {
    const type = getType(stub.originalId) === 'bar' ? 'bar' : 'line'
    return {
      ...stub,
      type,
      ...(type === 'line' && {curve: 'linear'}),
      color: resolveSeriesColor?.(stub.originalId, stub.color) ?? stub.color
    }
  })

  const lineSegments = segmentSeries
    .filter(segment => getType(segment.originalId) !== 'bar')
    .map(segment => ({
      ...segment,
      type: 'line',
      curve: 'linear'
    }))

  const segmentsByOriginal = new Map()
  for (const segment of segmentSeries) {
    if (getType(segment.originalId) !== 'bar') {
      continue
    }

    if (!segmentsByOriginal.has(segment.originalId)) {
      segmentsByOriginal.set(segment.originalId, [])
    }

    segmentsByOriginal.get(segment.originalId).push(segment)
  }

  const barSeries = stubSeries
    .filter(stub => getType(stub.originalId) === 'bar')
    .map(stub => {
      const mergedData = Array.from({length: xAxisLength}).fill(null)
      const segments = segmentsByOriginal.get(stub.originalId) ?? []

      for (const segment of segments) {
        for (let index = 0; index < segment.data.length; index += 1) {
          const value = segment.data[index]
          if (value === null || value === undefined) {
            continue
          }

          mergedData[index] = value
        }
      }

      return {
        id: `${stub.id}__bar`,
        originalId: stub.originalId,
        originalLabel: stub.originalLabel,
        type: 'bar',
        data: mergedData,
        layout: 'vertical',
        xAxisId: stub.xAxisId,
        yAxisId: stub.yAxisId,
        color: resolveSeriesColor?.(stub.originalId, stub.color) ?? stub.color,
        valueFormatter: formatBarValue
      }
    })

  const thresholdSeries = dynamicThresholdSeries.map(threshold => ({
    ...threshold,
    type: 'line',
    curve: 'linear'
  }))

  const composedSeries = [
    ...legendSeries,
    ...lineSegments,
    ...barSeries,
    ...thresholdSeries
  ]

  return {
    legendSeries,
    lineSegments,
    barSeries,
    thresholdSeries,
    composedSeries
  }
}

export default buildComposedSeries
