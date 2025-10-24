/**
 * Utility functions for managing time series frequency labels and ordering
 */

// Possible frequencies (specification) => French labels
export const FREQUENCY_LABELS = new Map([
  ['1 second', '1 seconde'],
  ['1 minute', '1 minute'],
  ['15 minutes', '15 minutes'],
  ['1 hour', '1 heure'],
  ['1 day', '1 jour']
])

// Frequency ordering for sorting (smallest to largest interval)
export const FREQUENCY_ORDER = {
  '1 second': 1,
  '1 minute': 2,
  '15 minutes': 3,
  '1 hour': 4,
  '1 day': 5
}

/**
 * Format a frequency value to its French label
 *
 * @param {string} frequency - Frequency value (e.g., '1 day', '15 minutes')
 * @returns {string|null} French label or original value if not found
 */
export function formatFrequencyLabel(frequency) {
  if (!frequency) {
    return null
  }

  const label = FREQUENCY_LABELS.get(frequency)
  return label ?? frequency
}

/**
 * Get the sort order for a frequency value
 *
 * @param {string} frequency - Frequency value
 * @returns {number} Sort order (lower = more frequent), 999 for unknown
 */
export function getFrequencyOrder(frequency) {
  return FREQUENCY_ORDER[frequency] ?? 999
}

/**
 * Sort frequencies in logical order (most frequent to least frequent)
 *
 * @param {Array<string>} frequencies - Array of frequency values
 * @returns {Array<string>} Sorted array of frequencies
 */
export function sortFrequencies(frequencies) {
  return [...frequencies].sort((a, b) => {
    const orderA = getFrequencyOrder(a)
    const orderB = getFrequencyOrder(b)
    return orderA - orderB
  })
}
