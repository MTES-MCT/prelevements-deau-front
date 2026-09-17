const MAX_READINGS = 20_000

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
        throw new Error('Plus de 20 000 relevés : réduisez la période pour afficher tous les index.')
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

  throw new Error('Trop de pages de relevés : réduisez la période pour afficher tous les index.')
}
