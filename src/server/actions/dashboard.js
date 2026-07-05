'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

const NO_WATER_BODY_TYPES_SENTINEL = '__none__'

function buildDashboardSearch(options = {}) {
  const params = new URLSearchParams()

  if (Array.isArray(options.zoneCodes) && options.zoneCodes.length > 0) {
    params.set('zones', options.zoneCodes.join(','))
  }

  if (options.periodType) {
    params.set('periodType', options.periodType)
  }

  if (options.period) {
    params.set('period', options.period)
  }

  if (options.year) {
    params.set('year', options.year)
  }

  if (Array.isArray(options.waterBodyTypes)) {
    params.set(
      'waterBodyTypes',
      options.waterBodyTypes.length > 0
        ? options.waterBodyTypes.join(',')
        : NO_WATER_BODY_TYPES_SENTINEL
    )
  }

  if (typeof options.waterBodyTypes === 'string' && options.waterBodyTypes) {
    params.set('waterBodyTypes', options.waterBodyTypes)
  }

  if (options.waterBodyType) {
    params.set('waterBodyType', options.waterBodyType)
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}

export async function getDashboardTerritoryAction(options = {}) {
  return withErrorHandling(async () =>
    fetchJSON(`api/dashboard/territory${buildDashboardSearch(options)}`))
}
