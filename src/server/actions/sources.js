'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

function buildSourcesSearch({
  declarant,
  dossierNumber,
  endDate,
  page,
  pageSize,
  startDate,
  statuses = []
} = {}) {
  const searchParams = new URLSearchParams()
  const filteredStatuses = Array.isArray(statuses)
    ? [...new Set(statuses.map(status => String(status).trim()).filter(Boolean))]
    : []

  for (const status of filteredStatuses) {
    searchParams.append('statuses', status)
  }

  const values = {
    declarant,
    dossierNumber,
    endDate,
    page,
    pageSize,
    startDate
  }

  for (const [key, value] of Object.entries(values)) {
    if (value) {
      searchParams.set(key, String(value))
    }
  }

  return searchParams.size > 0 ? `?${searchParams.toString()}` : ''
}

/**
 * Get current instructor sources, optionally filtered by statuses
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.statuses=[]] - Source statuses
 * @returns {Promise<Object>} Result object
 */
export async function getMySourcesAction(options = {}) {
  return withErrorHandling(async () => {
    const search = buildSourcesSearch(options)
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
