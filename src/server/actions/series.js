'use server'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'
import {normalizeDate} from '@/utils/time.js'

// ============================================================================
// Series
// ============================================================================

/**
 * Get series metadata
 * @param {string} seriesId - Series ID
 * @param {Object} options - Options
 * @param {boolean} [options.withPoint=false] - Include point info
 * @returns {Promise<Object>} - Result object
 */
export async function getSeriesMetadataAction(seriesId, {withPoint = false} = {}) {
  return withErrorHandling(async () => {
    const search = withPoint ? '?withPoint=1' : ''
    return fetchJSON(`api/series/${seriesId}${search}`)
  })
}

/**
 * Get series values
 * @param {string} seriesId - Series ID
 * @param {Object} options - Options
 * @param {string} [options.start] - Start date
 * @param {string} [options.end] - End date
 * @param {boolean} [options.withPoint=false] - Include point info
 * @returns {Promise<Object>} - Result object
 */
export async function getSeriesValuesAction(seriesId, {start, end, withPoint = false} = {}) {
  return withErrorHandling(async () => {
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
    return fetchJSON(`api/series/${seriesId}/values${query}`)
  })
}

/**
 * Search series
 * @param {Object} params - Search parameters
 * @param {string} [params.preleveurId] - Préleveur ID
 * @param {string} [params.pointId] - Point ID
 * @param {string} [params.from] - Start date
 * @param {string} [params.to] - End date
 * @returns {Promise<Object>} - Result object
 */
export async function searchSeriesAction({preleveurId, pointId, from, to, sourceId, metricTypeCode} = {}) {
  return withErrorHandling(async () => {
    const params = new URLSearchParams()

    if (preleveurId) {
      params.set('preleveurId', preleveurId)
    }

    if (pointId) {
      params.set('pointId', pointId)
    }

    if (sourceId) {
      params.set('sourceId', sourceId)
    }

    if (metricTypeCode) {
      params.set('metricTypeCode', metricTypeCode)
    }

    if (from) {
      params.set('from', from)
    }

    if (to) {
      params.set('to', to)
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchJSON(`api/series${query}`)
  })
}

// ============================================================================
// Aggregated Series
// ============================================================================

/**
 * Normalize a list of identifiers into a comma-separated string
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
 * Normalize a single identifier to a trimmed string
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
 * Build the query string for the aggregated series endpoint
 * This function is marked async to satisfy Next.js Server Actions requirements
 * @param {Object} params
 * @returns {Promise<string>}
 */
export async function buildAggregatedSeriesQuery(params = {}) {
  const {
    pointIds,
    preleveurId,
    sourceId,
    metricTypeCode,
    temporalOperator,
    aggregationFrequency,
    startDate,
    endDate,
    territoire,
    ...additionalParams
  } = params

  const queryParams = new URLSearchParams()

  const normalizedPointIds = normalizeIdentifierList(pointIds)
  const normalizedPreleveurId = normalizeIdentifier(preleveurId)
  const normalizedSourceId = normalizeIdentifier(sourceId)

  if (!normalizedPointIds && !normalizedPreleveurId && !normalizedSourceId) {
    throw new Error('La récupération de séries agrégées nécessite au moins un identifiant de point (pointIds), un identifiant de préleveur (preleveurId) ou un identifiant de source (sourceId).')
  }

  if (!metricTypeCode) {
    throw new Error('Le paramètre "metricTypeCode" est obligatoire pour l\'agrégation.')
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

  if (normalizedSourceId) {
    queryParams.set('sourceid', normalizedSourceId)
  }

  queryParams.set('metricTypeCode', metricTypeCode)
  queryParams.set('aggregationFrequency', aggregationFrequency)

  if (temporalOperator) {
    queryParams.set('temporalOperator', temporalOperator)
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
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Result object
 */
export async function getAggregatedSeriesAction(params = {}) {
  return withErrorHandling(async () => {
    const query = await buildAggregatedSeriesQuery(params)
    return fetchJSON(`api/aggregated-series${query}`)
  })
}

/**
 * Get aggregated series options (available parameters and date ranges)
 * @param {Object} params
 * @param {string|Array<string>} [params.pointIds] - Point IDs
 * @param {string} [params.preleveurId] - Préleveur ID
 * @param {string} [params.sourceId] - Source ID
 * @returns {Promise<Object>} - Result object
 */
export async function getAggregatedSeriesOptionsAction({pointIds, preleveurId, sourceId} = {}) {
  return withErrorHandling(async () => {
    const params = new URLSearchParams()

    const normalizedPointIds = normalizeIdentifierList(pointIds)
    if (normalizedPointIds) {
      params.set('pointIds', normalizedPointIds)
    }

    if (preleveurId !== undefined && preleveurId !== null) {
      params.set('preleveurId', preleveurId)
    }

    if (sourceId !== undefined && sourceId !== null) {
      params.set('sourceId', sourceId)
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchJSON(`api/aggregated-series/options${query}`)
  })
}
