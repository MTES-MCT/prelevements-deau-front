'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function searchCommunesAction(query) {
  if (typeof query !== 'string' || query.trim().length < 2) return {success: true, data: []}
  return withErrorHandling(() => fetchJSON(`api/referentiels/communes?q=${encodeURIComponent(query.trim().slice(0, 100))}`))
}
