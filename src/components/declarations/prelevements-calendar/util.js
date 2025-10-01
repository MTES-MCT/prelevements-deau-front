/**
 * Default fallback palette (approximate DSFR tones) used in tests or when DSFR tokens are not injected.
 */
export const DEFAULT_PALETTE = {
  error: '#CE0500',
  blue: '#000091',
  warning: '#FFAD00',
  grey: '#9C9C9C'
}

/**
 * Determine the display color for a given day based on values and anomalies.
 * Rules (priority order):
 * 1. Any negative value -> palette.error
 * 2. Daily volume ("volume prélevé") present (not NaN) -> palette.blue
 * 3. Any other data present (NaN placeholder or fifteen-minute data) -> palette.warning
 * 4. Otherwise -> palette.grey
 * @param {number[]} values Daily aggregated values array (may contain NaN or undefined)
 * @param {Array|undefined|null} fifteenMinutesValues Fifteen minutes slots (optional)
 * @param {Array} dailyParameters Parameters metadata list
 * @param {object} palette Color palette mapping keys {error, blue, warning, grey}
 * @returns {{color: string}}
 */
export function determineColors(values, fifteenMinutesValues, dailyParameters, palette = DEFAULT_PALETTE) {
  const hasNegativeValue = values?.some(v => v < 0)
  if (hasNegativeValue) {
    return {color: palette.error}
  }

  const volumePreleveParam = dailyParameters?.find(p => p.nom_parametre === 'volume prélevé')
  const volumePreleveIndex = volumePreleveParam ? dailyParameters.indexOf(volumePreleveParam) : -1

  const hasAnyData = values?.some(v => !Number.isNaN(v)) || (fifteenMinutesValues?.length > 0)

  if (volumePreleveIndex > -1 && !Number.isNaN(values?.[volumePreleveIndex])) {
    return {color: palette.blue}
  }

  if (hasAnyData) {
    return {color: palette.warning}
  }

  return {color: palette.grey}
}

/**
 * Build the `calendars` prop expected by the <CalendarGrid /> component.
 * Each sub-array corresponds to a month calendar (mode "month") containing day entries.
 * Days without data are omitted (calendar renders them as inactive grey cells).
 * @param {object} data Raw API object containing dailyValues & dailyParameters
 * @returns {Array<Array<{date: string, color: string, values: number[], fifteenMinutesValues?: any}>>}
 */
export function buildCalendars(data, palette = DEFAULT_PALETTE) {
  const dailyValues = data?.dailyValues || []
  const byMonth = new Map()

  for (const entry of dailyValues) {
    if (!entry?.date) {
      continue
    }

    const monthKey = entry.date.slice(0, 7) // YYYY-MM
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, [])
    }

    const {values = [], fifteenMinutesValues} = entry
    const {color} = determineColors(values, fifteenMinutesValues, data?.dailyParameters, palette)
    byMonth.get(monthKey).push({
      date: entry.date,
      color,
      values,
      fifteenMinutesValues
    })
  }

  const monthKeys = [...byMonth.keys()].sort()
  return monthKeys.map(mk => byMonth.get(mk).sort((a, b) => a.date.localeCompare(b.date)))
}
