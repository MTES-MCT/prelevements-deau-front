/**
 * Shared utilities for parsing and manipulating frequency strings
 * Used by TimeSeriesChart and PrelevementsSeriesExplorer components
 */

/**
 * Parse frequency string into value and unit
 * @param {string} frequency - Frequency string (e.g., '1 day', '15 minutes')
 * @returns {{value: number, unit: string}|null} Parsed frequency or null if parsing fails
 */
export const parseFrequency = frequency => {
  if (!frequency || typeof frequency !== 'string') {
    return null
  }

  const normalized = frequency.toLowerCase().trim()
  const match = normalized.match(/^(\d+)\s*(second|minute|hour|day|week|month|quarter|year)s?$/)

  if (!match) {
    return null
  }

  return {
    value: Number.parseInt(match[1], 10),
    unit: match[2]
  }
}

/**
 * Check if a frequency unit is calendar-based (variable duration)
 * @param {string} unit - Frequency unit
 * @returns {boolean} True if calendar-based
 */
export const isCalendarBasedUnit = unit => ['month', 'quarter', 'year'].includes(unit)

/**
 * Add calendar-based increment to a date
 * @param {Date} date - Starting date
 * @param {number} value - Number of units to add
 * @param {string} unit - Calendar unit ('month', 'quarter', 'year')
 * @returns {Date} New date with increment applied
 */
export const addCalendarIncrement = (date, value, unit) => {
  const result = new Date(date)

  switch (unit) {
    case 'month': {
      result.setMonth(result.getMonth() + value)
      break
    }

    case 'quarter': {
      result.setMonth(result.getMonth() + (value * 3))
      break
    }

    case 'year': {
      result.setFullYear(result.getFullYear() + value)
      break
    }

    default: {
      break
    }
  }

  return result
}
