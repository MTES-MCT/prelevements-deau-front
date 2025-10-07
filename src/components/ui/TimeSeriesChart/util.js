export const AXIS_LEFT_ID = 'y-left'
export const AXIS_RIGHT_ID = 'y-right'
export const X_AXIS_ID = 'time'

export const SEGMENT_ABOVE = 'above'
export const SEGMENT_BELOW = 'below'
export const SEGMENT_DEFAULT = 'default'

export const MAX_POINTS_BEFORE_DECIMATION = 2000
export const DECIMATION_TARGET = 800

export const toTimestamp = value => {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'number') {
    return value
  }

  throw new TypeError('TimeSeriesChart: `x` value must be a Date or a number (timestamp).')
}

export const toDate = value => new Date(value)

export const getNumberFormatter = locale => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 2
})

export const getDateFormatter = locale => new Intl.DateTimeFormat(locale, {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

const average = (points, accessor) => {
  if (points.length === 0) {
    return 0
  }

  return points.reduce((sum, point) => sum + accessor(point), 0) / points.length
}

export const largestTriangleThreeBuckets = (points, threshold) => {
  if (points.length <= threshold || threshold <= 2) {
    return points.map(point => point.index)
  }

  const sampled = [points[0].index]
  const bucketSize = (points.length - 2) / (threshold - 2)
  let previous = points[0]

  for (let i = 0; i < threshold - 2; i += 1) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1
    const range = points.slice(rangeStart, Math.min(rangeEnd, points.length))
    const avgX = average(range, point => point.x)
    const avgY = average(range, point => point.y)
    const bucketStart = Math.floor(i * bucketSize) + 1
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1
    const bucket = points.slice(bucketStart, Math.min(bucketEnd, points.length - 1))

    let maxArea = -1
    let candidatePoint = bucket[0]

    for (const candidate of bucket) {
      const area = Math.abs(((previous.x - avgX) * (candidate.y - previous.y)) - ((previous.x - candidate.x) * (avgY - previous.y))) / 2
      if (area > maxArea) {
        maxArea = area
        candidatePoint = candidate
      }
    }

    if (candidatePoint) {
      sampled.push(candidatePoint.index)
      previous = candidatePoint
    }
  }

  sampled.push(points.at(-1).index)
  return [...new Set(sampled)].sort((first, second) => first - second)
}

export const decimatePoints = (dataPoints, threshold) => {
  if (!Array.isArray(dataPoints) || dataPoints.length <= threshold) {
    return {indices: dataPoints.map((_, index) => index), didDecimate: false}
  }

  const keepIndices = new Set()
  const numericPoints = []

  for (const [index, point] of dataPoints.entries()) {
    if (point.y === null || Number.isNaN(point.y)) {
      keepIndices.add(index)
      continue
    }

    numericPoints.push({
      index,
      x: point.x,
      y: point.y,
      preserve: Boolean(point.meta && (point.meta.comment || point.meta.alert))
    })
  }

  if (numericPoints.length <= threshold) {
    return {indices: dataPoints.map((_, index) => index), didDecimate: false}
  }

  for (const point of numericPoints.filter(point => point.preserve)) {
    keepIndices.add(point.index)
  }

  const sampled = largestTriangleThreeBuckets(numericPoints, threshold)
  for (const index of sampled) {
    keepIndices.add(index)
  }

  return {indices: [...keepIndices].sort((first, second) => first - second), didDecimate: true}
}

export const buildThresholdEvaluator = threshold => {
  if (threshold === undefined) {
    return () => null
  }

  if (typeof threshold === 'number') {
    return () => threshold
  }

  if (Array.isArray(threshold)) {
    if (threshold.length === 0) {
      return () => null
    }

    const sorted = threshold
      .map(point => ({x: toTimestamp(point.x), y: point.y}))
      .sort((a, b) => a.x - b.x)

    const cache = new Map(sorted.map(point => [point.x, point.y]))

    return xValue => {
      if (cache.has(xValue)) {
        return cache.get(xValue)
      }

      let lowerIndex = -1
      for (const [index, element] of sorted.entries()) {
        if (element.x <= xValue) {
          lowerIndex = index
        } else {
          break
        }
      }

      if (lowerIndex < 0) {
        return sorted[0].y
      }

      if (lowerIndex >= sorted.length - 1) {
        return sorted.at(-1).y
      }

      const lower = sorted[lowerIndex]
      const upper = sorted[lowerIndex + 1]
      const range = upper.x - lower.x
      if (range === 0) {
        return lower.y
      }

      const ratio = (xValue - lower.x) / range
      return lower.y + (ratio * (upper.y - lower.y))
    }
  }

  throw new TypeError('TimeSeriesChart: invalid threshold format.')
}

export const classifyPoint = (y, threshold) => {
  if (y === null || Number.isNaN(y)) {
    return null
  }

  if (threshold === null || threshold === undefined) {
    return SEGMENT_DEFAULT
  }

  return y > threshold ? SEGMENT_ABOVE : SEGMENT_BELOW
}

/**
 * Process and prepare raw input series data
 * Sorts points, applies decimation, and normalizes data structure
 */
export const processInputSeries = inputSeries => {
  const axisId = inputSeries.axis === 'right' ? AXIS_RIGHT_ID : AXIS_LEFT_ID
  const thresholdEvaluator = buildThresholdEvaluator(inputSeries.threshold)

  const sortedPoints = [...inputSeries.data]
    .map(point => ({
      x: toTimestamp(point.x),
      y: point.y,
      meta: point.meta ?? null
    }))
    .sort((a, b) => a.x - b.x)

  const {indices, didDecimate} = decimatePoints(sortedPoints, DECIMATION_TARGET)
  const filteredPoints = indices.map(index => sortedPoints[index])

  return {
    axisId,
    thresholdEvaluator,
    sortedPoints,
    filteredPoints,
    didDecimate,
    id: inputSeries.id,
    label: inputSeries.label,
    color: inputSeries.color,
    threshold: inputSeries.threshold
  }
}

/**
 * Calculate synthetic threshold crossing points
 * Returns points where series data crosses threshold line
 */
export const computeThresholdCrossings = (filteredPoints, thresholdEvaluator) => {
  const crossings = []

  for (let index = 0; index < filteredPoints.length - 1; index += 1) {
    const current = filteredPoints[index]
    const next = filteredPoints[index + 1]

    if (current.y === null || next.y === null) {
      continue
    }

    const currentThreshold = thresholdEvaluator(current.x)
    const nextThreshold = thresholdEvaluator(next.x)

    if (currentThreshold === null || currentThreshold === undefined
        || nextThreshold === null || nextThreshold === undefined) {
      continue
    }

    const deltaCurrent = current.y - currentThreshold
    const deltaNext = next.y - nextThreshold

    // Check if crossing occurs (sign change between deltas)
    if (deltaCurrent === 0 || deltaNext === 0 || deltaCurrent * deltaNext > 0) {
      continue
    }

    const ratio = deltaCurrent / (deltaCurrent - deltaNext)
    const xCross = current.x + ((next.x - current.x) * ratio)
    const yCross = current.y + ((next.y - current.y) * ratio)

    crossings.push({
      x: xCross,
      y: yCross,
      meta: null,
      synthetic: true
    })
  }

  return crossings
}

/**
 * Build unified point map for a series
 * Combines actual data points with synthetic threshold crossings
 */
export const buildPointMap = (filteredPoints, thresholdCrossings, xValuesSet) => {
  const pointMap = new Map()

  const upsertPoint = (x, data) => {
    const existing = pointMap.get(x)
    if (!existing || existing.synthetic) {
      pointMap.set(x, data)
    }
  }

  for (const point of filteredPoints) {
    upsertPoint(point.x, {...point, synthetic: false})
    xValuesSet.add(point.x)
  }

  for (const crossing of thresholdCrossings) {
    upsertPoint(crossing.x, crossing)
    xValuesSet.add(crossing.x)
  }

  return pointMap
}

/**
 * Align series data to unified x-axis and update axis statistics
 */
export const alignSeriesToXAxis = (processedSeries, xValues, xAxisDates, axisStats) => {
  const metaBySeries = new Map()
  const pointBySeries = new Map()
  const alignedData = []

  for (const processed of processedSeries) {
    const metas = []
    const pointsWithMeta = []
    const values = []
    const thresholds = []

    for (const [index, xValue] of xValues.entries()) {
      const entry = processed.points.get(xValue) ?? null
      const y = entry ? entry.y : null
      const meta = entry ? entry.meta : null
      const synthetic = Boolean(entry?.synthetic)
      const thresholdValue = processed.thresholdEvaluator(xValue)

      // Update axis statistics
      if (y !== null && !Number.isNaN(y)) {
        const stats = axisStats[processed.axisId]
        stats.min = Math.min(stats.min, y)
        stats.max = Math.max(stats.max, y)
      }

      if (thresholdValue !== null && thresholdValue !== undefined) {
        const stats = axisStats[processed.axisId]
        stats.min = Math.min(stats.min, thresholdValue)
        stats.max = Math.max(stats.max, thresholdValue)
      }

      metas[index] = meta
      pointsWithMeta[index] = {
        x: xAxisDates[index],
        y,
        meta,
        synthetic,
        axisId: processed.axisId
      }
      values[index] = y
      thresholds[index] = thresholdValue
    }

    metaBySeries.set(processed.id, metas)
    pointBySeries.set(processed.id, pointsWithMeta)

    alignedData.push({
      ...processed,
      metas,
      pointsWithMeta,
      values,
      thresholds
    })
  }

  return {metaBySeries, pointBySeries, alignedData}
}

/**
 * Build threshold series for dynamic (time-varying) thresholds
 */
export const buildDynamicThresholdSeries = (alignedData, theme) => {
  const dynamicThresholdSeries = []

  for (const data of alignedData) {
    if (Array.isArray(data.thresholdConfig)) {
      dynamicThresholdSeries.push({
        id: `threshold-${data.id}`,
        originalId: data.id,
        originalLabel: data.label,
        color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.main,
        data: data.thresholds.map(value => (value === null || value === undefined ? null : value)),
        label: undefined,
        xAxisId: X_AXIS_ID,
        yAxisId: data.axisId,
        showMark: false,
        connectNulls: false,
        valueFormatter: () => null
      })
    }
  }

  return dynamicThresholdSeries
}

/**
 * Split series data into segments based on threshold classification
 */
export const buildSegments = (alignedData, xValues, options) => {
  const {numberFormatter, exposeAllMarks, theme} = options
  const segmentSeries = []
  const segmentToOriginal = new Map()

  for (const data of alignedData) {
    const {values, thresholds, pointsWithMeta, metas} = data
    let currentSegment = null
    const segments = []
    let previousSegmentLastIndex = null

    const flushSegment = (nextIndex = null) => {
      if (!currentSegment) {
        return
      }

      const segmentData = Array.from({length: xValues.length}).fill(null)
      // Helper function to include synthetic points in a segment
      const includeSyntheticPoint = (index, pointsWithMeta, values, segmentData) => {
        if (index === null || index === undefined) {
          return
        }

        const point = pointsWithMeta[index]
        if (!point?.synthetic) {
          return
        }

        const value = values[index]
        if (value === null || value === undefined) {
          return
        }

        segmentData[index] = value
      }

      includeSyntheticPoint(previousSegmentLastIndex, pointsWithMeta, values, segmentData)

      // Fill in current segment's points
      for (const index of currentSegment.indices) {
        segmentData[index] = values[index]
      }

      includeSyntheticPoint(nextIndex, pointsWithMeta, values, segmentData)
      const getLastIndexForNextSegment = (nextIndex, pointsWithMeta, currentSegment) => {
        if (nextIndex !== null && pointsWithMeta[nextIndex]?.synthetic) {
          return nextIndex
        }

        if (currentSegment.indices.length > 0) {
          return currentSegment.indices.at(-1)
        }

        return null
      }

      const lastIndexForNextSegment = getLastIndexForNextSegment(nextIndex, pointsWithMeta, currentSegment)

      const segmentId = `${data.id}__segment-${segments.length}`
      segments.push({
        id: segmentId,
        originalId: data.id,
        originalLabel: data.label,
        classification: currentSegment.classification,
        data: segmentData,
        xAxisId: X_AXIS_ID,
        yAxisId: data.axisId,
        color: currentSegment.classification === SEGMENT_ABOVE ? theme.palette.error.main : data.color,
        label: undefined,
        connectNulls: false,
        showMark({index}) {
          const point = pointsWithMeta[index]
          if (!point || point.synthetic) {
            return false
          }

          if (metas[index]) {
            return true
          }

          return exposeAllMarks
        },
        valueFormatter(value) {
          if (value === null || Number.isNaN(value)) {
            return null
          }

          return numberFormatter.format(value)
        }
      })
      segmentToOriginal.set(segmentId, data.id)
      currentSegment = null
      previousSegmentLastIndex = lastIndexForNextSegment
    }

    for (const [index, value] of values.entries()) {
      const classification = classifyPoint(value, thresholds[index])
      if (!classification) {
        flushSegment()
        previousSegmentLastIndex = null
        continue
      }

      if (!currentSegment || currentSegment.classification !== classification) {
        flushSegment(index)
        currentSegment = {
          classification,
          indices: []
        }
      }

      currentSegment.indices.push(index)
    }

    flushSegment()
    segmentSeries.push(...segments)
  }

  return {segmentSeries, segmentToOriginal}
}

/**
 * Build stub series for legend display
 */
export const buildStubSeries = (processedSeries, xValuesLength) => processedSeries.map(processed => ({
  id: processed.id,
  originalId: processed.id,
  originalLabel: processed.label,
  label: processed.label,
  color: processed.color,
  data: Array.from({length: xValuesLength}).fill(null),
  xAxisId: X_AXIS_ID,
  yAxisId: processed.axisId,
  showMark: false,
  connectNulls: false,
  valueFormatter: () => null
}))

/**
 * Build single y-axis configuration
 */
const buildSingleYAxis = (axisId, stats, numberFormatter) => {
  const hasData = stats.min !== Number.POSITIVE_INFINITY

  // Create a default axis even if no data to prevent useYScale errors
  // This ensures both axes are always defined for React hooks consistency
  if (!hasData) {
    return {
      id: axisId,
      position: axisId === AXIS_LEFT_ID ? 'left' : 'right',
      scaleType: 'linear',
      valueFormatter(value) {
        if (value === null || value === undefined) {
          return ''
        }

        return numberFormatter.format(value)
      },
      min: 0,
      max: 1,
      hasData: false // Mark as empty for conditional rendering
    }
  }

  if (stats.min === stats.max) {
    stats.min -= 1
    stats.max += 1
  }

  return {
    id: axisId,
    position: axisId === AXIS_LEFT_ID ? 'left' : 'right',
    scaleType: 'linear',
    valueFormatter(value) {
      if (value === null || value === undefined) {
        return ''
      }

      return numberFormatter.format(value)
    },
    min: stats.min,
    max: stats.max,
    hasData: true
  }
}

/**
 * Build y-axis configurations from statistics
 */
export const buildYAxisConfigurations = (axisStats, numberFormatter) =>
  [AXIS_LEFT_ID, AXIS_RIGHT_ID].map(axisId => buildSingleYAxis(axisId, axisStats[axisId], numberFormatter))

/**
 * Extract static thresholds from processed series
 */
export const extractStaticThresholds = processedSeries => {
  const staticThresholds = []

  for (const processed of processedSeries) {
    if (typeof processed.threshold === 'number') {
      staticThresholds.push({
        axisId: processed.axisId,
        value: processed.threshold,
        color: processed.color
      })
    }
  }

  return staticThresholds
}

/**
 * Main orchestrator function that builds complete series model
 * Coordinates all sub-functions to transform raw series into chart-ready data
 */
export const buildSeriesModel = ({series, locale, theme, exposeAllMarks}) => {
  const numberFormatter = getNumberFormatter(locale)
  const xValuesSet = new Set()
  const processedSeries = []
  let didDecimate = false

  const axisStats = {
    [AXIS_LEFT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
    [AXIS_RIGHT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
  }

  // Step 1: Process each input series
  for (const inputSeries of series) {
    const processed = processInputSeries(inputSeries)

    if (processed.didDecimate || processed.sortedPoints.length > MAX_POINTS_BEFORE_DECIMATION) {
      didDecimate = true
    }

    // Calculate threshold crossings
    const crossings = computeThresholdCrossings(processed.filteredPoints, processed.thresholdEvaluator)

    // Build unified point map
    const pointMap = buildPointMap(processed.filteredPoints, crossings, xValuesSet)

    processedSeries.push({
      id: processed.id,
      label: processed.label,
      color: processed.color,
      axisId: processed.axisId,
      thresholdEvaluator: processed.thresholdEvaluator,
      thresholdConfig: processed.threshold,
      threshold: processed.threshold, // Keep for extractStaticThresholds
      points: pointMap
    })
  }

  // Step 2: Create unified x-axis
  const xValues = [...xValuesSet].sort((a, b) => a - b)
  const xAxisDates = xValues.map(value => toDate(value))

  // Step 3: Align all series to unified x-axis and update statistics
  const {metaBySeries, pointBySeries, alignedData} = alignSeriesToXAxis(
    processedSeries,
    xValues,
    xAxisDates,
    axisStats
  )

  // Step 4: Build dynamic threshold series
  const dynamicThresholdSeries = buildDynamicThresholdSeries(alignedData, theme)

  // Step 5: Build segments
  const {segmentSeries, segmentToOriginal} = buildSegments(alignedData, xValues, {
    numberFormatter,
    exposeAllMarks,
    theme
  })

  // Step 6: Build stub series for legend
  const stubSeries = buildStubSeries(processedSeries, xValues.length)

  // Step 7: Extract static thresholds
  const staticThresholds = extractStaticThresholds(processedSeries)

  // Step 8: Build y-axis configurations
  const yAxis = buildYAxisConfigurations(axisStats, numberFormatter)

  return {
    xValues,
    xAxisDates,
    yAxis,
    segmentSeries,
    stubSeries,
    dynamicThresholdSeries,
    staticThresholds,
    segmentToOriginal,
    metaBySeries,
    pointBySeries,
    didDecimate
  }
}

export const axisFormatterFactory = locale => {
  const formatter = getDateFormatter(locale)
  return value => formatter.format(value instanceof Date ? value : new Date(value))
}

export const buildAnnotations = ({pointBySeries, visibility, theme}) => {
  const annotations = []
  for (const [seriesId, points] of pointBySeries.entries()) {
    if (visibility[seriesId] === false) {
      continue
    }

    for (const [index, point] of points.entries()) {
      if (!point || point.synthetic || !point.meta || point.y === null || Number.isNaN(point.y)) {
        continue
      }

      annotations.push({
        seriesId,
        axisId: point.axisId,
        index,
        x: point.x,
        y: point.y,
        originalPoint: point,
        color: theme.palette.info.main
      })
    }
  }

  return annotations
}
