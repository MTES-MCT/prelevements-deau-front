'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

// ============================================================================
// Points de prélèvement
// ============================================================================

/**
 * Get all points de prélèvement
 * @returns {Promise<Object>} - Result object
 */
export async function getPointsPrelevementAction() {
  return withErrorHandling(async () => fetchJSON('api/points-prelevement'))
}

/**
 * Get a single point de prélèvement by ID
 * @param {string} id - Point ID
 * @returns {Promise<Object>} - Result object
 */
export async function getPointPrelevementAction(id) {
  return withErrorHandling(async () => fetchJSON(`api/points-prelevement/${id}`))
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
