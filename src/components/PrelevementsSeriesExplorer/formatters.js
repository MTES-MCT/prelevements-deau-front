/**
 * Formatting helpers for PrelevementsSeriesExplorer
 */

import {format} from 'date-fns'
import {fr} from 'date-fns/locale'

import {MONTH_NAMES} from './constants/colors.js'

/**
 * Get color for a parameter based on its index
 * Uses modulo to cycle through palette if more parameters than colors
 *
 * @param {number} index - Parameter index
 * @param {Array<string>} palette - Color palette to use
 * @returns {string} Color hex code
 */
export const getColorForIndex = (index, palette) => palette[index % palette.length]

/**
 * Converts period type to view label
 * Handles mixed cases where both years and months are selected
 *
 * @param {Array} periods - Selected periods
 * @returns {string|null} View label
 */
export function getViewTypeLabel(periods) {
  if (!periods || periods.length === 0) {
    return null
  }

  // Check if there are any year-type periods
  const hasYears = periods.some(p => p.type === 'year')
  const hasMonths = periods.some(p => p.type === 'month')

  // If mixed or multiple years, treat as years view
  if (hasYears && hasMonths) {
    return 'ANNÉES'
  }

  if (hasYears) {
    return 'ANNÉES'
  }

  return 'MOIS'
}

/**
 * Format a concise label summarizing the selected periods
 * Handles mixed cases where both years and months are selected
 *
 * @param {Array} periods - Selected periods
 * @param {string} fallback - Fallback text if no periods
 * @returns {string} Formatted period label
 */
export function formatPeriodLabel(periods, fallback) {
  if (!periods || periods.length === 0) {
    return fallback
  }

  if (periods.length === 1) {
    const [period] = periods

    if (period.type === 'year') {
      return String(period.value)
    }

    return `${MONTH_NAMES[period.month]} ${period.year}`
  }

  // Extract years from all periods (both year and month types)
  const years = new Set()
  const months = []

  for (const period of periods) {
    if (period.type === 'year') {
      years.add(period.value)
    } else if (period.type === 'month') {
      years.add(period.year)
      months.push(period)
    }
  }

  // If multiple years involved, show year range
  if (years.size > 1) {
    const sortedYears = [...years].sort((a, b) => a - b)
    return `${sortedYears[0]} - ${sortedYears.at(-1)}`
  }

  // Single year with months
  if (months.length > 0) {
    const sortedMonths = [...months].sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year
      }

      return a.month - b.month
    })
    const first = sortedMonths[0]
    const last = sortedMonths.at(-1)
    return `${MONTH_NAMES[first.month]} ${first.year} - ${MONTH_NAMES[last.month]} ${last.year}`
  }

  // Fallback to first and last for consistency
  const first = periods[0]
  const last = periods.at(-1)

  if (first.type === 'year') {
    return `${first.value} - ${last.type === 'year' ? last.value : last.year}`
  }

  return `${MONTH_NAMES[first.month]} ${first.year} - ${MONTH_NAMES[last.month]} ${last.year}`
}

/**
 * Format slider mark label
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatSliderMark(date) {
  return format(date, 'd MMM', {locale: fr})
}

/**
 * Format slider value label (tooltip)
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatSliderValue(date) {
  return format(date, 'd MMMM yyyy', {locale: fr})
}
