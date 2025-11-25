/**
 * Utility functions for managing time series frequency labels and ordering
 */

// Possible frequencies (specification) => French labels
export const FREQUENCY_LABELS = new Map([
  ['1 second', '1 seconde'],
  ['1 minute', '1 minute'],
  ['15 minutes', '15 minutes'],
  ['1 hour', '1 heure'],
  ['6 hours', '6 heures'],
  ['1 day', '1 jour'],
  ['1 month', '1 mois'],
  ['1 quarter', '1 trimestre'],
  ['6 months', '6 mois'],
  ['1 year', '1 an']
])

// Frequency ordering for sorting (smallest to largest interval)
export const FREQUENCY_ORDER = {
  '1 second': 1,
  '1 minute': 2,
  '15 minutes': 3,
  '1 hour': 4,
  '6 hours': 4.5,
  '1 day': 5,
  '1 month': 6,
  '1 quarter': 7,
  '6 months': 7.5,
  '1 year': 8
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

/**
 * Pick the closest available frequency that is compatible with the target.
 * - If the target is available, return it.
 * - Otherwise, pick the first available frequency that is coarser than the target.
 * - If none are coarser, fall back to the coarsest available frequency.
 * - If no availability is provided, return the target (may be null).
 *
 * @param {string|null} targetFrequency - Desired frequency (e.g., '1 day')
 * @param {Array<string>} availableFrequencies - List of allowed frequencies
 * @returns {string|null} Frequency to use that respects the availability
 */
export function pickAvailableFrequency(targetFrequency, availableFrequencies) {
  const uniqueAvailable = [...new Set((availableFrequencies ?? []).filter(Boolean))]

  if (uniqueAvailable.length === 0) {
    return targetFrequency ?? null
  }

  if (targetFrequency && uniqueAvailable.includes(targetFrequency)) {
    return targetFrequency
  }

  const sorted = sortFrequencies(uniqueAvailable)

  if (!targetFrequency) {
    return sorted[0] ?? null
  }

  const targetOrder = getFrequencyOrder(targetFrequency)
  if (targetOrder !== 999) {
    const coarserOrEqual = sorted.find(freq => getFrequencyOrder(freq) >= targetOrder)
    if (coarserOrEqual) {
      return coarserOrEqual
    }
  }

  return sorted.at(-1) ?? null
}
