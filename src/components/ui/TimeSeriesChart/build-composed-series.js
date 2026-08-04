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
      curve: stub.curve ?? 'linear',
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
      // Bucket-based series opt into a stepped line so their value remains
      // horizontal over the complete period. Cumulative series can also fill
      // the interval down to zero to make sparse periods easier to perceive.
      curve: segment.curve ?? (segment.area ? 'stepAfter' : 'linear')
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

/**
 * Keep bucket intervals visually distinct without turning them into bars.
 * The area remains deliberately light while the stepped outline carries the
 * exact value and period boundaries.
 */
export function buildSeriesElementStyles({composedSeries, dynamicThresholdSeries}) {
  const styles = {}

  for (const threshold of dynamicThresholdSeries) {
    styles[`& .MuiLineElement-series-${threshold.id}`] = {strokeDasharray: '4 4'}
  }

  for (const item of composedSeries) {
    if (item.curve === 'stepAfter') {
      styles[`& .MuiLineElement-series-${item.id}`] = {
        ...styles[`& .MuiLineElement-series-${item.id}`],
        strokeLinecap: 'round',
        strokeWidth: 3
      }
    }

    if (item.area) {
      styles[`& .MuiAreaElement-series-${item.id}`] = {fillOpacity: 0.18}
    }
  }

  return styles
}

export default buildComposedSeries
