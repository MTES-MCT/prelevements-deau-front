'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

// ============================================================================
// Préleveurs
// ============================================================================

/**
 * Get all préleveurs
 * @returns {Promise<Object>} - Result object
 */
export async function getPreleveursAction() {
  return withErrorHandling(async () => fetchJSON('api/preleveurs'))
}

/**
 * Get a single préleveur by ID
 * @param {string} id - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function getPreleveurAction(id) {
  return withErrorHandling(async () => fetchJSON(`api/preleveurs/${id}`))
}

/**
 * Create a new préleveur
 * @param {Object} payload - Préleveur data
 * @returns {Promise<Object>} - Result object
 */
export async function createPreleveurAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/preleveurs', {
      method: 'POST',
      body: payload
    })
    revalidatePath('/preleveurs')
    return result
  })
}

/**
 * Update a préleveur
 * @param {string} idPreleveur - Préleveur ID
 * @param {Object} payload - Updated préleveur data
 * @returns {Promise<Object>} - Result object
 */
export async function updatePreleveurAction(idPreleveur, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/preleveurs/${idPreleveur}`, {
      method: 'PUT',
      body: payload
    })
    revalidatePath('/preleveurs')
    revalidatePath(`/preleveurs/${idPreleveur}`)
    return result
  })
}

/**
 * Delete a préleveur
 * @param {string} idPreleveur - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function deletePreleveurAction(idPreleveur) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/preleveurs/${idPreleveur}`, {
      method: 'DELETE'
    })
    revalidatePath('/preleveurs')
    return result
  })
}

/**
 * Get points de prélèvement for a préleveur
 * @param {string} idPreleveur - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function getPointsFromPreleveurAction(idPreleveur) {
  return withErrorHandling(async () => {
    try {
      return await fetchJSON(`api/preleveurs/${idPreleveur}/points-prelevement`)
    } catch (error) {
      // Return empty array on error (consistent with original behavior)
      if (error.code === 404) {
        return []
      }

      throw error
    }
  })
}

/**
 * Get exploitations for a préleveur
 * @param {string} idPreleveur - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function getExploitationFromPreleveurAction(idPreleveur) {
  return withErrorHandling(async () => fetchJSON(`api/preleveurs/${idPreleveur}/exploitations`))
}
