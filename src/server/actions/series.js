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
 * @param {boolean} [params.onlyIntegratedDays] - Only include integrated days
 * @returns {Promise<Object>} - Result object
 */
export async function searchSeriesAction({preleveurId, pointId, from, to, onlyIntegratedDays} = {}) {
  return withErrorHandling(async () => {
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
    attachmentId,
    parameter,
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
  const normalizedAttachmentId = normalizeIdentifier(attachmentId)

  if (!normalizedPointIds && !normalizedPreleveurId && !normalizedAttachmentId) {
    throw new Error('La récupération de séries agrégées nécessite au moins un identifiant de point (pointIds), un identifiant de préleveur (preleveurId) ou un identifiant de fichier (attachmentId).')
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

  if (normalizedAttachmentId) {
    queryParams.set('attachmentId', normalizedAttachmentId)
  }

  queryParams.set('parameter', parameter)
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
 * @param {string|number|Array<string|number>} [params.pointIds] - Point IDs
 * @param {string|number} [params.preleveurId] - Préleveur ID
 * @param {string|number} [params.attachmentId] - Attachment ID
 * @returns {Promise<Object>} - Result object
 */
export async function getAggregatedSeriesOptionsAction({pointIds, preleveurId, attachmentId} = {}) {
  return withErrorHandling(async () => {
    const params = new URLSearchParams()

    const normalizedPointIds = normalizeIdentifierList(pointIds)
    if (normalizedPointIds) {
      params.set('pointIds', normalizedPointIds)
    }

    if (preleveurId !== undefined && preleveurId !== null) {
      params.set('preleveurId', String(preleveurId))
    }

    if (attachmentId !== undefined && attachmentId !== null) {
      params.set('attachmentId', String(attachmentId))
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchJSON(`api/aggregated-series/options${query}`)
  })
}
