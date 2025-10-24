/**
 * Data utilities for the Calendar component.
 * Handles mode detection, value map building and date formatting helpers.
 */

// Supported date format patterns
export const PATTERN_DAY = /^\d{4}-\d{2}-\d{2}$/
export const PATTERN_MONTH = /^\d{4}-\d{2}$/
export const PATTERN_YEAR = /^\d{4}$/

// International (fr-FR) month formatters
export const monthFormatter = new Intl.DateTimeFormat('fr-FR', {month: 'long'})
export const monthShortFormatter = new Intl.DateTimeFormat('fr-FR', {month: 'short'})

// Simple capitalization (first letter)
export const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * Detect display mode (month / year / years) and validate coherence.
 * @param {Array<{date: string}>} values
 * @returns {{mode: 'month'|'year'|'years'|null, error: string|null}}
 */
export function detectModeAndValidate(values) {
  if (!values || values.length === 0) {
    return {mode: null, error: 'Aucune valeur fournie'}
  }

  const formats = new Set()
  for (const v of values) {
    if (!v?.date || typeof v.date !== 'string') {
      return {mode: null, error: 'Valeur de date manquante ou invalide'}
    }

    if (PATTERN_DAY.test(v.date)) {
      formats.add('day')
    } else if (PATTERN_MONTH.test(v.date)) {
      formats.add('month')
    } else if (PATTERN_YEAR.test(v.date)) {
      formats.add('year')
    } else {
      return {mode: null, error: `Format de date non supporté: ${v.date}`}
    }
  }

  if (formats.size !== 1) {
    return {mode: null, error: 'Plusieurs formats de dates détectés'}
  }

  let mode
  if (formats.has('day')) {
    mode = 'month'
  } else if (formats.has('month')) {
    mode = 'year'
  } else {
    mode = 'years'
  }

  // Additional validations
  if (mode === 'month') {
    const ymSet = new Set(values.map(v => v.date.slice(0, 7)))
    if (ymSet.size > 1) {
      return {mode: null, error: 'Plusieurs mois détectés'}
    }
  } else if (mode === 'year') {
    const ySet = new Set(values.map(v => v.date.slice(0, 4)))
    if (ySet.size > 1) {
      return {mode: null, error: 'Plusieurs années détectées pour le mode année'}
    }
  }

  return {mode, error: null}
}

/**
 * Build a Map indexed by date for O(1) lookup.
 * @param {Array<{date: string}>} values
 * @returns {Map<string, any>}
 */
export function buildValueMap(values) {
  const map = new Map()
  for (const v of values) {
    map.set(v.date, v)
  }

  return map
}
