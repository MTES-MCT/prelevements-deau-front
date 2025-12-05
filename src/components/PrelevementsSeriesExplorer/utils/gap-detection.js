/**
 * Gap detection utility for time series data
 * Detects significant temporal gaps based on aggregation frequency
 * and inserts null values to break line continuity in charts
 */

import {
  addCalendarIncrement,
  isCalendarBasedUnit,
  parseFrequency
} from '@/utils/frequency-parsing.js'

/**
 * Parse frequency string and convert to milliseconds
 * Supports formats like '1 day', '1 week', '1 month', '1 quarter', '1 hour', etc.
 *
 * @param {string} frequency - Frequency string (e.g., '1 day', '7 days', '1 month')
 * @returns {number} Frequency interval in milliseconds
 */
export const parseFrequencyToMs = frequency => {
  if (!frequency || typeof frequency !== 'string') {
    return null
  }

  const normalized = frequency.toLowerCase().trim()
  const match = normalized.match(/^(\d+)\s*(second|minute|hour|day|week|month|quarter|year)s?$/)

  if (!match) {
    return null
  }

  const value = Number.parseInt(match[1], 10)
  const unit = match[2]

  const MS_PER_MINUTE = 60 * 1000
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const MS_PER_WEEK = 7 * MS_PER_DAY
  // Approximate: months can have 28, 29, 30, or 31 days; using 30 days may cause slight inaccuracies,
  // but is acceptable for gap detection purposes in time series visualization.
  const MS_PER_MONTH = 30 * MS_PER_DAY
  const MS_PER_QUARTER = 90 * MS_PER_DAY
  const MS_PER_YEAR = 365 * MS_PER_DAY // Approximate

  const unitMap = {
    second: 1000,
    minute: MS_PER_MINUTE,
    hour: MS_PER_HOUR,
    day: MS_PER_DAY,
    week: MS_PER_WEEK,
    month: MS_PER_MONTH,
    quarter: MS_PER_QUARTER,
    year: MS_PER_YEAR
  }

  return value * (unitMap[unit] ?? 0)
}

/**
 * Calculate the threshold for considering a gap significant
 * Uses a multiplier approach: gap is significant if it exceeds expected interval * multiplier
 *
 * @param {number} frequencyMs - Expected interval in milliseconds
 * @param {number} multiplier - Gap multiplier threshold (default: 1.5x the expected interval)
 * @returns {number} Gap threshold in milliseconds
 */
export const calculateGapThreshold = (frequencyMs, multiplier = 1.5) => {
  if (!frequencyMs || frequencyMs <= 0) {
    return Number.POSITIVE_INFINITY // No gap detection if frequency unknown
  }

  return frequencyMs * multiplier
}

/**
 * Detect gaps in time series data and insert null values to break line continuity
 *
 * @param {Array<{x: Date, y: number|null}>} data - Time series data points
 * @param {string} frequency - Aggregation frequency (e.g., '1 day', '1 week')
 * @param {number} gapMultiplier - Multiplier for gap detection (default: 1.5)
 * @returns {Array<{x: Date, y: number|null, isGapPoint: boolean}>} Data with gap points inserted
 */
export const insertGapPoints = (data, frequency, gapMultiplier = 1.5) => {
  if (!Array.isArray(data) || data.length === 0) {
    return data
  }

  const frequencyMs = parseFrequencyToMs(frequency)
  if (!frequencyMs) {
    // If frequency cannot be parsed, return data as-is (no gap detection)
    return data
  }

  const gapThreshold = calculateGapThreshold(frequencyMs, gapMultiplier)
  const result = []

  // Ratio used to position the gap point slightly after the current point.
  // 10% of the gap duration is chosen to visually break the line in charts without overlapping the next point.
  const GAP_POINT_POSITION_RATIO = 0.1

  for (let i = 0; i < data.length; i++) {
    const current = data[i]
    result.push({...current, isGapPoint: false})

    // Check if there's a next point to compare
    if (i < data.length - 1) {
      const next = data[i + 1]
      const currentTime = current.x instanceof Date ? current.x.getTime() : new Date(current.x).getTime()
      const nextTime = next.x instanceof Date ? next.x.getTime() : new Date(next.x).getTime()
      const gap = nextTime - currentTime

      // If gap exceeds threshold, insert a null point to break the line
      if (gap > gapThreshold) {
        // Insert null point slightly after current point
        const gapPointTime = currentTime + (gap * GAP_POINT_POSITION_RATIO)
        result.push({
          x: new Date(gapPointTime),
          y: null,
          isGapPoint: true
        })
      }
    }
  }

  return result
}

/**
 * Identify segment boundaries in time series data
 * A segment is a continuous sequence of data points (non-null y values) separated by gaps.
 * This function marks the first and last points of each segment for rendering visible markers.
 *
 * Behavior:
 * - First and last point of each continuous segment get showMark: true
 * - Middle points of segments get showMark: false
 * - Gap points (null values) are never marked for display
 * - Isolated single points (segment of length 1) get showMark: true
 *
 * @param {Array<{x: Date, y: number|null, isGapPoint?: boolean}>} data - Time series data (possibly with gap points)
 * @returns {Array<{x: Date, y: number|null, isGapPoint?: boolean, showMark?: boolean}>} Data with showMark flags
 */
export const identifySegmentBoundaries = data => {
  if (!Array.isArray(data) || data.length === 0) {
    return data
  }

  const result = []
  let segmentPoints = []

  for (const point of data) {
    // Gap point or null value - end current segment if exists
    if (point.isGapPoint || point.y === null || point.y === undefined) {
      // Mark boundaries of completed segment
      if (segmentPoints.length > 0) {
        for (let j = 0; j < segmentPoints.length; j++) {
          const isFirst = j === 0
          const isLast = j === segmentPoints.length - 1
          // Mark first and last points of segment, or the only point if segment has length 1
          result.push({
            ...segmentPoints[j],
            showMark: isFirst || isLast
          })
        }

        segmentPoints = []
      }

      // Add gap point without mark
      result.push({
        ...point,
        showMark: false
      })
    } else {
      // Valid data point - add to current segment
      segmentPoints.push(point)
    }
  }

  // Handle final segment if data ends with valid points
  if (segmentPoints.length > 0) {
    for (let j = 0; j < segmentPoints.length; j++) {
      const isFirst = j === 0
      const isLast = j === segmentPoints.length - 1
      result.push({
        ...segmentPoints[j],
        showMark: isFirst || isLast
      })
    }
  }

  return result
}

/**
 * Process time series data with gap detection and segment boundary identification
 * Combines gap insertion with segment boundary marking for optimal chart rendering
 *
 * @param {Array<{x: Date, y: number|null}>} data - Time series data points
 * @param {string} frequency - Aggregation frequency (e.g., '1 day', '1 week')
 * @param {number} gapMultiplier - Multiplier for gap detection (default: 1.5)
 * @returns {Array<{x: Date, y: number|null, isGapPoint?: boolean, showMark?: boolean}>} Processed data
 */
export const processTimeSeriesData = (data, frequency, gapMultiplier = 1.5) => {
  if (!Array.isArray(data) || data.length === 0) {
    return data
  }

  // Step 1: Insert gap points to break line continuity
  const dataWithGaps = frequency ? insertGapPoints(data, frequency, gapMultiplier) : data

  // Step 2: Identify and mark segment boundaries for visible markers
  return identifySegmentBoundaries(dataWithGaps)
}

/**
 * Apply gap detection to multiple series data
 * Useful when processing chart series with same frequency
 *
 * @param {Array<{id: string, data: Array, ...}>} series - Array of series objects
 * @param {string} frequency - Aggregation frequency
 * @param {number} gapMultiplier - Gap detection multiplier
 * @returns {Array<{id: string, data: Array, ...}>} Series with gap points inserted
 */
export const applyGapDetectionToSeries = (series, frequency, gapMultiplier = 1.5) => {
  if (!Array.isArray(series) || !frequency) {
    return series
  }

  return series.map(item => ({
    ...item,
    data: insertGapPoints(item.data, frequency, gapMultiplier)
  }))
}

/**
 * Normalize a date to the start of its calendar period
 * @param {Date} date - Date to normalize
 * @param {string} unit - Calendar unit ('month', 'quarter', 'year')
 * @returns {Date} Normalized date at period start
 */
const normalizeToCalendarPeriodStart = (date, unit) => {
  switch (unit) {
    case 'month': {
      return new Date(date.getFullYear(), date.getMonth(), 1)
    }

    case 'quarter': {
      const quarterMonth = Math.floor(date.getMonth() / 3) * 3
      return new Date(date.getFullYear(), quarterMonth, 1)
    }

    case 'year': {
      return new Date(date.getFullYear(), 0, 1)
    }

    default: {
      return date
    }
  }
}

/**
 * Generate a complete linear timeline with regular intervals
 * Creates a grid of timestamps from start to end at the specified frequency
 * Uses calendar-based increments for month/quarter/year to handle variable durations
 *
 * @param {Date|number} startDate - Start of the timeline
 * @param {Date|number} endDate - End of the timeline
 * @param {string} frequency - Interval frequency (e.g., '1 day', '1 hour', '15 minutes', '1 month')
 * @returns {Date[]} Array of Date objects at regular intervals
 */
export const generateLinearTimeline = (startDate, endDate, frequency) => {
  if (!startDate || !endDate || !frequency) {
    return []
  }

  const parsed = parseFrequency(frequency)
  if (!parsed) {
    return []
  }

  const {value, unit} = parsed

  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  if (start.getTime() >= end.getTime()) {
    return []
  }

  // Limit the number of generated points to prevent memory issues
  const MAX_TIMELINE_POINTS = 10_000

  // For calendar-based units, use proper date arithmetic
  if (isCalendarBasedUnit(unit)) {
    const normalizedStart = normalizeToCalendarPeriodStart(start, unit)

    const timeline = []
    let currentDate = normalizedStart

    while (currentDate.getTime() <= end.getTime() && timeline.length < MAX_TIMELINE_POINTS) {
      timeline.push(new Date(currentDate))
      currentDate = addCalendarIncrement(currentDate, value, unit)
    }

    return timeline
  }

  // For fixed-duration units, use millisecond arithmetic
  const frequencyMs = parseFrequencyToMs(frequency)
  if (!frequencyMs || frequencyMs <= 0) {
    return []
  }

  const startMs = start.getTime()
  const endMs = end.getTime()
  const expectedPoints = Math.ceil((endMs - startMs) / frequencyMs) + 1

  if (expectedPoints > MAX_TIMELINE_POINTS) {
    return []
  }

  const timeline = []
  let current = startMs

  while (current <= endMs) {
    timeline.push(new Date(current))
    current += frequencyMs
  }

  return timeline
}

/**
 * Align series data to a linear timeline, filling gaps with null values
 * Preserves segment breaks by inserting explicit gap markers where data is missing
 *
 * @param {Array<{x: Date, y: number|null, ...}>} data - Series data points
 * @param {Date[]} timeline - Complete linear timeline
 * @param {string} frequency - Data frequency for gap detection
 * @param {number} gapMultiplier - Multiplier for gap threshold (default: 1.5)
 * @returns {Array<{x: Date, y: number|null, isGapPoint: boolean, showMark: boolean}>} Aligned data
 */
export const alignSeriesToLinearTimeline = (data, timeline, frequency, gapMultiplier = 1.5) => {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    // Fall back to original gap detection if no timeline provided
    return processTimeSeriesData(data, frequency, gapMultiplier)
  }

  if (!Array.isArray(data) || data.length === 0) {
    // Return timeline with all null values
    return timeline.map(date => ({
      x: date,
      y: null,
      isGapPoint: true,
      showMark: false
    }))
  }

  const frequencyMs = parseFrequencyToMs(frequency)
  // Tolerance for matching timestamps (half the frequency interval)
  const tolerance = frequencyMs ? frequencyMs / 2 : 0

  // Create a map of data points by timestamp for efficient lookup
  const dataMap = new Map()
  for (const point of data) {
    const timestamp = point.x instanceof Date ? point.x.getTime() : new Date(point.x).getTime()
    dataMap.set(timestamp, point)
  }

  const result = []
  let inSegment = false
  let segmentStartIndex = -1

  for (const timelineDate of timeline) {
    const timelineTs = timelineDate.getTime()

    // Find matching data point within tolerance
    let matchedPoint = dataMap.get(timelineTs)

    // If no exact match, search within tolerance
    if (!matchedPoint && tolerance > 0) {
      for (const [ts, point] of dataMap.entries()) {
        if (Math.abs(ts - timelineTs) <= tolerance) {
          matchedPoint = point
          break
        }
      }
    }

    if (matchedPoint && matchedPoint.y !== null && matchedPoint.y !== undefined) {
      // Valid data point
      if (!inSegment) {
        // Starting a new segment
        inSegment = true
        segmentStartIndex = result.length
      }

      result.push({
        x: timelineDate,
        y: matchedPoint.y,
        meta: matchedPoint.meta ?? null,
        isGapPoint: false,
        showMark: false // Will be updated when segment ends
      })
    } else {
      // Missing data point - gap in the timeline
      if (inSegment) {
        // End current segment - mark boundaries
        const segmentEndIndex = result.length - 1
        if (segmentStartIndex >= 0 && segmentStartIndex <= segmentEndIndex) {
          result[segmentStartIndex].showMark = true
          result[segmentEndIndex].showMark = true
        }

        inSegment = false
        segmentStartIndex = -1
      }

      result.push({
        x: timelineDate,
        y: null,
        isGapPoint: true,
        showMark: false
      })
    }
  }

  // Handle final segment if data ends with valid points
  if (inSegment && segmentStartIndex >= 0) {
    const segmentEndIndex = result.length - 1
    result[segmentStartIndex].showMark = true
    if (segmentEndIndex !== segmentStartIndex) {
      result[segmentEndIndex].showMark = true
    }
  }

  return result
}
