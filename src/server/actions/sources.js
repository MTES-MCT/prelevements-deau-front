'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

function buildStatusesSearch(statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return ''
  }

  const filteredStatuses = [...new Set(statuses.map(status => String(status).trim()).filter(Boolean))]

  if (filteredStatuses.length === 0) {
    return ''
  }

  const searchParams = new URLSearchParams()

  for (const status of filteredStatuses) {
    searchParams.append('statuses', status)
  }

  return `?${searchParams.toString()}`
}

/**
 * Get current instructor sources, optionally filtered by statuses
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.statuses=[]] - Source statuses
 * @returns {Promise<Object>} Result object
 */
export async function getMySourcesAction({statuses = []} = {}) {
  return withErrorHandling(async () => {
    const search = buildStatusesSearch(statuses)
    return fetchJSON(`api/sources/me${search}`)
  })
}

/**
 * Get a single source by ID
 * @param {string} sourceId - Source ID
 * @returns {Promise<Object>} Result object
 */
export async function getMySourceAction(sourceId) {
  return withErrorHandling(async () => fetchJSON(`api/sources/${sourceId}`))
}

/**
 * Revalidate source paths after mutations
 * @param {string} [sourceId] - Optional source ID
 */
export async function revalidateSourcePaths(sourceId) {
  revalidatePath('/sources')

  if (sourceId) {
    revalidatePath(`/sources/${sourceId}`)
  }
}
