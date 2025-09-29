import {isArray, forEach, min} from 'lodash-es'

/**
 * Compute a stable unique key for a calendar dataset without relying on its index.
 * Strategy: concatenate the ordered list of date fields (empty segment if missing).
 */
export function computeCalendarKey(values) {
  if (!isArray(values) || values.length === 0) {
    return 'cal-empty'
  }

  // Preserve order intentionally (order significance is used in tests).
  // Missing dates yield empty segments to keep a deterministic shape.
  return values
    .map(v => (v && typeof v.date === 'string' ? v.date : ''))
    .join('|')
}

/**
 * Validate the `calendars` prop shape.
 * Returns an object { ok: boolean, problems: string[] } where problems lists human-readable issues.
 * This is a pure validation helper and does not mutate the input.
 */
export function validateCalendars(calendars) {
  const problems = []

  if (calendars === null || calendars === undefined) {
    // Null or undefined is allowed by caller; treated as empty in the component.
    return {ok: true, problems}
  }

  if (!isArray(calendars)) {
    problems.push('calendars is not an array')
    return {ok: false, problems}
  }

  forEach(calendars, (sub, i) => {
    if (!isArray(sub)) {
      problems.push(`calendars[${i}] is not an array`)
      return
    }

    forEach(sub, (v, j) => {
      if (!v || typeof v !== 'object') {
        problems.push(`calendars[${i}][${j}] is not an object`)
        return
      }

      const {date} = v
      if (typeof date !== 'string' || date.trim() === '') {
        problems.push(`calendars[${i}][${j}].date is missing or not a string ('${date}')`)
        return
      }

      if (Number.isNaN(Date.parse(date))) {
        problems.push(`calendars[${i}][${j}].date is not a parseable date ('${date}')`)
      }
    })
  })

  return {ok: problems.length === 0, problems}
}

/**
 * Return the earliest date string found in the values array, or null if none.
 * This helper does not mutate the input and tolerates empty arrays.
 */
export function getMinDate(values) {
  if (!isArray(values) || values.length === 0) {
    return null
  }

  const validDates = []
  forEach(values, v => {
    if (!v || typeof v.date !== 'string') {
      return
    }

    const d = v.date.trim()
    if (!d) {
      return
    }

    // Only accept parseable dates. (Assumption: domain uses ISO YYYY-MM-DD.)
    if (!Number.isNaN(Date.parse(d))) {
      validDates.push(d)
    }
  })

  if (validDates.length === 0) {
    return null
  }

  // For ISO 8601 (YYYY-MM-DD) strings lexical min === chronological min.
  return min(validDates)
}
