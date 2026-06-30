'use client'

import {
  getZoneCollecteursAction,
  getZoneDeclarantsAction,
  getZoneExploitationsAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

const EXPORT_PER_PAGE = 100

function getOptionsFromMeta(meta, extraOptions = {}) {
  const options = {
    ...meta?.filters,
    ...extraOptions
  }

  if (meta?.search) {
    options.search = meta.search
  }

  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function unwrapRows(payload) {
  if (Array.isArray(payload)) {
    return {
      rows: payload,
      pages: 1
    }
  }

  return {
    rows: Array.isArray(payload?.data) ? payload.data : [],
    pages: Number(payload?.meta?.pages || 1)
  }
}

async function fetchAllZoneRows(fetcher, zoneId, meta, extraOptions = {}) {
  const baseOptions = getOptionsFromMeta(meta, extraOptions)
  const rows = []
  let page = 1
  let pages = 1

  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetcher(zoneId, {
      ...baseOptions,
      page,
      perPage: EXPORT_PER_PAGE
    })

    if (!response.success) {
      throw new Error(response.error || 'Impossible de récupérer les données à exporter.')
    }

    const payload = unwrapRows(response.data)
    rows.push(...payload.rows)
    pages = Number.isFinite(payload.pages) && payload.pages > 0 ? payload.pages : 1
    page += 1
  } while (page <= pages)

  return rows
}

export async function resolveAllZoneDeclarants(zoneId, meta) {
  return fetchAllZoneRows(getZoneDeclarantsAction, zoneId, meta, {
    declarantRole: 'PRELEVEUR'
  })
}

export async function resolveAllZoneCollecteurs(zoneId, meta) {
  return fetchAllZoneRows(getZoneCollecteursAction, zoneId, meta)
}

export async function resolveAllZonePoints(zoneId, meta) {
  return fetchAllZoneRows(getZonePointsPrelevementAction, zoneId, meta)
}

export async function resolveAllZoneExploitations(zoneId, meta) {
  return fetchAllZoneRows(getZoneExploitationsAction, zoneId, meta)
}
