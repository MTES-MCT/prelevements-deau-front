const MAX_READINGS = 20_000
export const METER_SERIES_LIMIT = 'METER_SERIES_LIMIT'
const limitError = message => Object.assign(new Error(message), {code: METER_SERIES_LIMIT})

export function validateMeterSeriesRange({start, end}, bounds) {
  const validDay = day => /^\d{4}-\d{2}-\d{2}$/.test(day ?? '')
    && Number.isFinite(Date.parse(`${day}T00:00:00Z`))
    && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
  if (!validDay(start) || !validDay(end) || start > end || start < bounds.start || end > bounds.end) {
    throw new Error('Choisissez une période comprise dans les dates disponibles.')
  }
  return {start, end}
}

/** Physical indexes are observations, never aggregated or apportioned volumes. */
export function getMeterSeriesQuery(parameter) {
  return parameter?.readingSeries === true && parameter.meterId
    ? {meterId: parameter.meterId, temporalOperator: 'raw', aggregationFrequency: 'instantaneous'}
    : {}
}

export async function loadMeterSeriesPages(fetchPage) {
  const values = []
  const cursors = new Set()
  let cursor
  let metadata
  let count = 0
  let excludedReadingsCount = 0
  let minDate
  let maxDate

  for (let page = 0; page < 20; page++) {
    const result = await fetchPage({limit: 5000, ...(cursor ? {cursor} : {})})
    if (result?.metadata?.readingSeries !== true || !Array.isArray(result.values)) {
      throw new Error('Réponse des relevés du compteur invalide.')
    }

    metadata ??= result.metadata
    for (const day of result.values) {
      if (!Array.isArray(day.values)) {
        throw new Error('Réponse des relevés du compteur invalide.')
      }

      count += day.values.length
      excludedReadingsCount += day.values.filter(reading => reading.admissible !== true).length
      if (day.values.length) {
        minDate = minDate === undefined || day.date < minDate ? day.date : minDate
        maxDate = maxDate === undefined || day.date > maxDate ? day.date : maxDate
      }
      if (count > MAX_READINGS) {
        throw limitError('Plus de 20 000 relevés : réduisez la période pour afficher tous les index.')
      }

      values.push(day)
    }

    if (!result.nextCursor) {
      return {...result, metadata: {...metadata, valuesCount: count, excludedReadingsCount, ...(minDate ? {minDate, maxDate} : {})}, values}
    }

    if (cursors.has(result.nextCursor)) {
      throw new Error('La pagination des relevés du compteur est invalide.')
    }

    cursors.add(result.nextCursor)
    cursor = result.nextCursor
  }

  throw limitError('Trop de pages de relevés : réduisez la période pour afficher tous les index.')
}
