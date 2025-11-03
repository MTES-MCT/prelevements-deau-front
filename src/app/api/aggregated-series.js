import {executeRequest, getAuthorization} from './util/request.js'

const ENDPOINT = 'api/aggregated-series'

/**
 * Normalize a list of identifiers (numbers, strings, arrays, or sets) into a
 * comma-separated string suitable for the API.
 * @param {string|number|Array<string|number>|Set<string|number>} ids
 * @returns {string|undefined}
 */
function normalizeIdentifierList(ids) {
  if (ids === undefined || ids === null) {
    return undefined
  }

  let values
  if (Array.isArray(ids)) {
    values = ids
  } else if (ids instanceof Set) {
    values = [...ids]
  } else if (typeof ids === 'string') {
    values = ids.split(',')
  } else {
    values = [ids]
  }

  const normalized = values
    .map(value => {
      if (value === null || value === undefined) {
        return ''
      }

      return typeof value === 'string' ? value.trim() : String(value)
    })
    .filter(Boolean)

  return normalized.length > 0 ? normalized.join(',') : undefined
}

/**
 * Normalize a single identifier to a trimmed string.
 * @param {string|number|undefined|null} id
 * @returns {string|undefined}
 */
function normalizeIdentifier(id) {
  if (id === undefined || id === null || id === '') {
    return undefined
  }

  return typeof id === 'string' ? id.trim() : String(id)
}

/**
 * Normalize a date parameter. Accepts string or Date.
 * @param {string|Date|undefined|null} date
 * @returns {string|undefined}
 */
function normalizeDate(date) {
  if (date === undefined || date === null || date === '') {
    return undefined
  }

  if (date instanceof Date) {
    return date.toISOString().slice(0, 10)
  }

  return String(date)
}

/**
 * Build the query string for the aggregated series endpoint.
 * @param {Object} params
 * @returns {string}
 */
export function buildAggregatedSeriesQuery(params = {}) {
  const {
    pointIds,
    preleveurId,
    parameter,
    operator,
    aggregationFrequency,
    startDate,
    endDate,
    territoire,
    ...additionalParams
  } = params

  const queryParams = new URLSearchParams()

  const normalizedPointIds = normalizeIdentifierList(pointIds)
  const normalizedPreleveurId = normalizeIdentifier(preleveurId)

  if (!normalizedPointIds && !normalizedPreleveurId) {
    throw new Error('Le helper agrégé requiert au moins un pointIds ou un preleveurId.')
  }

  if (!parameter) {
    throw new Error('Le paramètre \'parameter\' est obligatoire pour l’agrégation.')
  }

  if (!aggregationFrequency) {
    throw new Error('Le paramètre \'aggregationFrequency\' est obligatoire pour l’agrégation.')
  }

  if (normalizedPointIds) {
    queryParams.set('pointIds', normalizedPointIds)
  }

  if (normalizedPreleveurId) {
    queryParams.set('preleveurId', normalizedPreleveurId)
  }

  queryParams.set('parameter', parameter)
  queryParams.set('aggregationFrequency', aggregationFrequency)

  if (operator) {
    queryParams.set('operator', operator)
  }

  const normalizedStartDate = normalizeDate(startDate)
  if (normalizedStartDate) {
    queryParams.set('startDate', normalizedStartDate)
  }

  const normalizedEndDate = normalizeDate(endDate)
  if (normalizedEndDate) {
    queryParams.set('endDate', normalizedEndDate)
  }

  if (territoire) {
    queryParams.set('territoire', territoire)
  }

  for (const [key, value] of Object.entries(additionalParams)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    queryParams.set(key, String(value))
  }

  const queryString = queryParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Fetch aggregated time series from the API
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function getAggregatedSeries(params = {}) {
  const query = buildAggregatedSeriesQuery(params)
  const response = await executeRequest(
    `${ENDPOINT}${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const error = new Error(payload?.message || 'Échec de la récupération des séries agrégées')
    error.code = payload?.code ?? response.status
    error.details = payload
    throw error
  }

  return payload
}
