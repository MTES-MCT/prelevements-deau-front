/**
 * Utilities for calculating selectable and default periods from date ranges
 * Used for limiting time series exploration to specific date boundaries
 */

/**
 * Calculate selectable periods (years and months range) from a date range
 * Used to restrict period selection in the UI based on external constraints (e.g., exploitation dates)
 *
 * @param {string|Date|null} startDate - Start date of the range (ISO string or Date object)
 * @param {string|Date|null} endDate - End date of the range (ISO string or Date object)
 * @returns {{years: number[], months: {start: Date, end: Date}}|undefined} Selectable periods or undefined if no valid dates
 *
 * @example
 * // Returns years [2023, 2024] and months range
 * calculateSelectablePeriodsFromDateRange('2023-03-15', '2024-11-20')
 */
export function calculateSelectablePeriodsFromDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return undefined
  }

  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  if (!start && !end) {
    return undefined
  }

  // Determine min and max years from dates
  const minYear = start ? start.getFullYear() : 1900
  const maxYear = end ? end.getFullYear() : 2100

  const years = []
  for (let year = minYear; year <= maxYear; year++) {
    years.push(year)
  }

  return {
    years,
    months: {
      start: start ?? new Date(1900, 0, 1),
      end: end ?? new Date(2100, 11, 31)
    }
  }
}

/**
 * Extract default periods from a date range
 * Returns period objects based on the date range span
 *
 * Logic:
 * - If date range spans multiple years: returns year periods for each year
 * - If date range is within a single year: returns month periods for each month
 * - If only one date provided: returns undefined (requires both dates)
 *
 * @param {string|Date|null} startDate - Start date of the range (ISO string or Date object)
 * @param {string|Date|null} endDate - End date of the range (ISO string or Date object)
 * @returns {Array<{type: 'year', value: number}|{type: 'month', year: number, month: number}>|undefined} Period objects or undefined
 *
 * @example
 * // Returns [{type: 'year', value: 2023}, {type: 'year', value: 2024}]
 * extractDefaultPeriodsFromDateRange('2023-01-01', '2024-12-31')
 *
 * @example
 * // Returns [{type: 'month', year: 2024, month: 0}, {type: 'month', year: 2024, month: 1}]
 * extractDefaultPeriodsFromDateRange('2024-01-15', '2024-02-20')
 */
export function extractDefaultPeriodsFromDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return undefined
  }

  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  // Require both dates for default periods
  if (!start || !end) {
    return undefined
  }

  const minYear = start.getFullYear()
  const maxYear = end.getFullYear()

  // If multiple years, return year periods
  if (maxYear > minYear) {
    const periods = []
    for (let year = minYear; year <= maxYear; year++) {
      periods.push({type: 'year', value: year})
    }

    return periods
  }

  // Single year: return month periods
  const periods = []
  const minMonth = start.getMonth()
  const maxMonth = end.getMonth()

  for (let month = minMonth; month <= maxMonth; month++) {
    periods.push({
      type: 'month',
      year: minYear,
      month
    })
  }

  return periods
}
