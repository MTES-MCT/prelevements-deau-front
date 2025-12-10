'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

// ============================================================================
// Règles
// ============================================================================

/**
 * Get règles for a préleveur
 * @param {string} idPreleveur - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function getReglesFromPreleveurAction(idPreleveur) {
  return withErrorHandling(async () => {
    try {
      return await fetchJSON(`api/preleveurs/${idPreleveur}/regles`)
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
 * Get a single règle by ID
 * @param {string} regleId - Règle ID
 * @returns {Promise<Object>} - Result object
 */
export async function getRegleAction(regleId) {
  return withErrorHandling(async () => fetchJSON(`api/regles/${regleId}`))
}

/**
 * Create a new règle for a préleveur
 * @param {string} preleveurId - Préleveur ID
 * @param {Object} payload - Règle data
 * @returns {Promise<Object>} - Result object
 */
export async function createRegleAction(preleveurId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/preleveurs/${preleveurId}/regles`, {
      method: 'POST',
      body: payload
    })
    revalidatePath(`/preleveurs/${preleveurId}`)
    return result
  })
}

/**
 * Update a règle
 * @param {string} regleId - Règle ID
 * @param {Object} payload - Updated règle data
 * @returns {Promise<Object>} - Result object
 */
export async function updateRegleAction(regleId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/regles/${regleId}`, {
      method: 'PUT',
      body: payload
    })
    return result
  })
}

/**
 * Delete a règle
 * @param {string} regleId - Règle ID
 * @param {string} [preleveurId] - Optional préleveur ID for revalidation
 * @returns {Promise<Object>} - Result object
 */
export async function deleteRegleAction(regleId, preleveurId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/regles/${regleId}`, {
      method: 'DELETE'
    })
    if (preleveurId) {
      revalidatePath(`/preleveurs/${preleveurId}`)
    }

    return result
  })
}
