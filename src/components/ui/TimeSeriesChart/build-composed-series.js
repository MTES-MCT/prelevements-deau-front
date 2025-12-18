/**
 * Compose the final list of series (line segments, thresholds and legend metadata)
 * used by the chart container.
 *
 * @param {Object} params
 * @param {Array} params.stubSeries - Base series definitions (one per parameter) used for the legend.
 * @param {Array} params.segmentSeries - Line segments produced by the threshold processor.
 * @param {Array} params.dynamicThresholdSeries - Dynamic threshold series.
 * @param {Function} params.resolveSeriesColor - Function returning the resolved color for a given series (handles hidden state).
 *
 * @returns {Object} Object containing legendSeries, lineSegments, thresholdSeries and composedSeries.
 */
export function buildComposedSeries({
  stubSeries,
  segmentSeries,
  dynamicThresholdSeries,
  resolveSeriesColor
}) {
  const legendSeries = stubSeries.map(stub => {
    const resolved = {
      ...stub,
      type: 'line',
      curve: 'linear',
      color: resolveSeriesColor?.(stub.originalId, stub.color) ?? stub.color
    }
    // Explicitly preserve area and stack from original stub
    if (stub.area) {
      resolved.area = stub.area
    }

    if (stub.stack) {
      resolved.stack = stub.stack
    }

    return resolved
  })

  const lineSegments = segmentSeries.map(segment => {
    const resolved = {
      ...segment,
      type: 'line',
      curve: 'linear'
    }
    // Explicitly preserve area and stack from original segment
    if (segment.area) {
      resolved.area = segment.area
    }

    if (segment.stack) {
      resolved.stack = segment.stack
    }

    return resolved
  })

  const thresholdSeries = dynamicThresholdSeries.map(threshold => ({
    ...threshold,
    type: 'line',
    curve: 'linear'
  }))

  const composedSeries = [
    ...legendSeries,
    ...lineSegments,
    ...thresholdSeries
  ]

  return {
    legendSeries,
    lineSegments,
    thresholdSeries,
    composedSeries
  }
}

export default buildComposedSeries
