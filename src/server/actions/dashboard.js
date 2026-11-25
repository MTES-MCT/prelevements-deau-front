'use server'

import {
  buildDashboardMapSearch,
  buildDashboardTerritorySearch,
  buildDashboardWaterResourceSearch
} from '@/lib/dashboard-api.js'
import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function getDashboardTerritoryAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/territory${buildDashboardTerritorySearch(options)}`))
}

export async function getDashboardMapAction(options) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/map${buildDashboardMapSearch(options)}`))
}

export async function getDashboardPointActorsAction(pointId) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/map/points/${encodeURIComponent(pointId)}/actors`))
}

export async function getDashboardPiezometryAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/water-resources/piezometry${buildDashboardWaterResourceSearch(options)}`))
}

export async function getDashboardRiverFlowsAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/water-resources/flows${buildDashboardWaterResourceSearch(options)}`))
}
