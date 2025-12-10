'use server'

import {
  authenticatedFetch,
  withErrorHandling
} from '@/server/api-wrapper.js'

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get statistics, optionally for a specific territoire
 * @param {string} [territoire] - Optional territoire code
 * @returns {Promise<Object>} - Result object
 */
export async function getStatsAction(territoire) {
  return withErrorHandling(async () => {
    const path = territoire ? `api/stats/${territoire}` : 'api/stats'
    const response = await authenticatedFetch(path, {requireAuth: false})
    return response.json()
  })
}
