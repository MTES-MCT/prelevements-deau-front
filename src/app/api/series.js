import {executeRequest, getAuthorization} from './util/request.js'

import {normalizeDate} from '@/utils/time.js'

export async function getSeriesMetadata(seriesId, {withPoint = false} = {}) {
  const search = withPoint ? '?withPoint=1' : ''
  const response = await executeRequest(
    `api/series/${seriesId}${search}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function getSeriesValues(seriesId, {start, end, withPoint = false} = {}) {
  const params = new URLSearchParams()
  if (start) {
    params.set('start', start)
  }

  if (end) {
    params.set('end', end)
  }

  if (withPoint) {
    params.set('withPoint', '1')
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await executeRequest(
    `api/series/${seriesId}/values${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function searchSeries({preleveurId, pointId, from, to, onlyIntegratedDays} = {}) {
  const params = new URLSearchParams()

  if (preleveurId) {
    params.set('preleveurId', preleveurId)
  }

  if (pointId) {
    params.set('pointId', pointId)
  }

  if (from) {
    params.set('from', from)
  }

  if (to) {
    params.set('to', to)
  }

  if (onlyIntegratedDays) {
    params.set('onlyIntegratedDays', onlyIntegratedDays ? '1' : '0')
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await executeRequest(
    `api/series${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

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
    throw new Error('Le paramètre "parameter" est obligatoire pour l\'agrégation.')
  }

  if (!aggregationFrequency) {
    throw new Error('Le paramètre "aggregationFrequency" est obligatoire pour l\'agrégation.')
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
    `api/aggregated-series${query}`,
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

/**
 * Get aggregated series options (available parameters and date ranges)
 * @param {Object} params
 * @param {string|number|Array<string|number>} [params.pointIds] - Point IDs
 * @param {string|number} [params.preleveurId] - Preleveur ID
 * @returns {Promise<Object>} Object with parameters and points arrays
 */
export async function getAggregatedSeriesOptions({pointIds, preleveurId} = {}) {
  const params = new URLSearchParams()

  // Normalize pointIds to comma-separated string
  if (pointIds !== undefined && pointIds !== null) {
    const normalizedPointIds = Array.isArray(pointIds)
      ? pointIds.join(',')
      : String(pointIds)
    params.set('pointIds', normalizedPointIds)
  }

  if (preleveurId !== undefined && preleveurId !== null) {
    params.set('preleveurId', String(preleveurId))
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await executeRequest(
    `api/aggregated-series/options${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}
