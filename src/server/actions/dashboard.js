'use server'

import {
  buildDashboardMapSearch,
  buildDashboardTerritorySearch
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

function buildWaterResourceSearch(options = {}) {
  const parameters = new URLSearchParams()

  if (Array.isArray(options.zoneCodes) && options.zoneCodes.length > 0) {
    parameters.set('zones', options.zoneCodes.join(','))
  }

  if (options.period) {
    parameters.set('period', options.period)
  }

  if (options.includeIps) {
    parameters.set('includeIps', 'true')
  }

  const search = parameters.toString()
  return search ? `?${search}` : ''
}

export async function getDashboardPiezometryAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/water-resources/piezometry${buildWaterResourceSearch(options)}`))
}

export async function getDashboardRiverFlowsAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/water-resources/flows${buildWaterResourceSearch(options)}`))
}
