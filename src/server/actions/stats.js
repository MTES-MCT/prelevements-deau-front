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
 * @returns {Promise<Object>} - Result object
 */
export async function getStatsAction() {
  return withErrorHandling(async () => {
    const response = await authenticatedFetch('api/stats', {requireAuth: false})
    return response.json()
  })
}
