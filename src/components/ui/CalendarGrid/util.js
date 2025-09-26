/**
 * Compute a stable unique key for a calendar dataset without relying on its index.
 * Strategy: collect date (or id fallback) fields, sort if needed, and join into a string.
 */
export function computeCalendarKey(values) {
  // Simplified key strategy: concatenate the ordered list of dates
  // Assumption (per project domain): each object has a unique 'date' string inside the calendar dataset.
  if (!Array.isArray(values) || values.length === 0) {
    return 'cal-empty'
  }

  // Keep original order; if order is not guaranteed you could add .sort() before join.
  return values.map(v => v.date).join('|')
}
