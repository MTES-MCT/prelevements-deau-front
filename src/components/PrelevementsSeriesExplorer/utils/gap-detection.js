/**
 * Gap detection utility for time series data
 * Detects significant temporal gaps based on aggregation frequency
 * and inserts null values to break line continuity in charts
 */

/**
 * Parse frequency string and convert to milliseconds
 * Supports formats like '1 day', '1 week', '1 month', '1 hour', etc.
 *
 * @param {string} frequency - Frequency string (e.g., '1 day', '7 days', '1 month')
 * @returns {number} Frequency interval in milliseconds
 */
export const parseFrequencyToMs = frequency => {
  if (!frequency || typeof frequency !== 'string') {
    return null
  }

  const normalized = frequency.toLowerCase().trim()
  const match = normalized.match(/^(\d+)\s*(hour|day|week|month|year)s?$/)

  if (!match) {
    return null
  }

  const value = Number.parseInt(match[1], 10)
  const unit = match[2]

  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const MS_PER_WEEK = 7 * MS_PER_DAY
  // Approximate: months can have 28, 29, 30, or 31 days; using 30 days may cause slight inaccuracies,
  // but is acceptable for gap detection purposes in time series visualization.
  const MS_PER_MONTH = 30 * MS_PER_DAY
  const MS_PER_YEAR = 365 * MS_PER_DAY // Approximate

  const unitMap = {
    hour: MS_PER_HOUR,
    day: MS_PER_DAY,
    week: MS_PER_WEEK,
    month: MS_PER_MONTH,
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
