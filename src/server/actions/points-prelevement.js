'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'
import {cachePerRequest} from '@/server/request-cache.js'

// ============================================================================
// Points de prélèvement
// ============================================================================

/**
 * Get all enriched points de prélèvement
 * @returns {Promise<Object>} - Result object
 */
export async function getPointsPrelevementAction() {
  return withErrorHandling(async () => fetchJSON('api/points-prelevement'))
}

/**
 * Get point summaries needed by the map and its filters.
 * Detailed declarants are intentionally loaded only when a popup is opened.
 * @returns {Promise<Object>} - Result object
 */
const getCachedPointMapSummaries = cachePerRequest(async () => withErrorHandling(
  async () => fetchJSON('api/points-prelevement/map')
))

export async function getPointMapSummariesAction() {
  return getCachedPointMapSummaries()
}

/**
 * Get all light points de prélèvement
 * @returns {Promise<Object>} - Result object
 */
export async function getPointsPrelevementOptionsAction() {
  return withErrorHandling(async () => fetchJSON('api/points-prelevement/options'))
}

/**
 * Get a single point de prélèvement by ID
 * @param {string} id - Point ID
 * @returns {Promise<Object>} - Result object
 */
const getCachedPointPrelevement = cachePerRequest(async id => withErrorHandling(
  async () => fetchJSON(`api/points-prelevement/${id}`)
))

export async function getPointPrelevementAction(id) {
  return getCachedPointPrelevement(id)
}

export async function getPointsPrelevementBatchAction(ids) {
  return withErrorHandling(async () => fetchJSON('api/points-prelevement/batch', {
    method: 'POST',
    body: {ids}
  }))
}

/**
 * Create a new point de prélèvement
 * @param {Object} payload - Point data
 * @returns {Promise<Object>} - Result object
 */
export async function createPointPrelevementAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/points-prelevement', {
      method: 'POST',
      body: payload
    })
    revalidatePath('/points-prelevement')
    return result
  })
}

/**
 * Update a point de prélèvement
 * @param {string} id - Point ID
 * @param {Object} payload - Updated point data
 * @returns {Promise<Object>} - Result object
 */
export async function editPointPrelevementAction(id, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/points-prelevement/${id}`, {
      method: 'PUT',
      body: payload
    })
    revalidatePath('/points-prelevement')
    revalidatePath(`/points-prelevement/${id}`)
    return result
  })
}

export async function editPointUsageNameAction(id, usageName) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/points-prelevement/${id}/usage-name`, {
      method: 'PATCH',
      body: {usageName}
    })
    revalidatePath('/')
    revalidatePath('/mes-declarations', 'layout')
    revalidatePath('/points-prelevement')
    revalidatePath(`/points-prelevement/${id}`)
    return result
  })
}

/**
 * Delete a point de prélèvement
 * @param {string} id - Point ID
 * @returns {Promise<Object>} - Result object
 */
export async function deletePointPrelevementAction(id) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/points-prelevement/${id}`, {
      method: 'DELETE'
    })
    revalidatePath('/points-prelevement')
    return result
  })
}

/**
 * Get exploitations for a point
 * @param {string} pointId - Point ID
 * @returns {Promise<Object>} - Result object
 */
export async function getExploitationsByPointIdAction(pointId) {
  return withErrorHandling(async () => fetchJSON(`api/points-prelevement/${pointId}/exploitations`))
}

// ============================================================================
// Référentiels
// ============================================================================

/**
 * Get BNPE referential data
 * @returns {Promise<Object>} - Result object
 */
export async function getBnpeAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/bnpe'))
}

/**
 * Get BSS referential data
 * @returns {Promise<Object>} - Result object
 */
export async function getBssAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/bss'))
}

/**
 * Get MESO referential data
 * @returns {Promise<Object>} - Result object
 */
export async function getMesoAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/meso'))
}

/**
 * Get ME continentales referential data
 * @returns {Promise<Object>} - Result object
 */
export async function getMeContinentalesAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/me-continentales-bv'))
}

/**
 * Get BV Bdcarthage referential data
 * @returns {Promise<Object>} - Result object
 */
export async function getBvBdcarthageAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/bv-bdcarthage'))
}
