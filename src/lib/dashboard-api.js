const NO_WATER_BODY_TYPES_SENTINEL = '__none__'
const DASHBOARD_MAP_SCOPES = new Set(['activity', 'territory'])

function appendZoneCodes(parameters, zoneCodes) {
  if (Array.isArray(zoneCodes) && zoneCodes.length > 0) {
    parameters.set('zones', zoneCodes.join(','))
  }
}

export function buildDashboardTerritorySearch(options = {}) {
  const parameters = new URLSearchParams()

  appendZoneCodes(parameters, options.zoneCodes)

  if (options.periodType) {
    parameters.set('periodType', options.periodType)
  }

  if (options.period) {
    parameters.set('period', options.period)
  }

  if (options.year) {
    parameters.set('year', options.year)
  }

  if (Array.isArray(options.waterBodyTypes)) {
    parameters.set(
      'waterBodyTypes',
      options.waterBodyTypes.length > 0
        ? options.waterBodyTypes.join(',')
        : NO_WATER_BODY_TYPES_SENTINEL
    )
  }

  if (typeof options.waterBodyTypes === 'string' && options.waterBodyTypes) {
    parameters.set('waterBodyTypes', options.waterBodyTypes)
  }

  if (options.waterBodyType) {
    parameters.set('waterBodyType', options.waterBodyType)
  }

  if (typeof options.includePoints === 'boolean') {
    parameters.set('includePoints', String(options.includePoints))
  }

  const search = parameters.toString()
  return search ? `?${search}` : ''
}

export function buildDashboardMapSearch({scope, zoneCodes} = {}) {
  if (!DASHBOARD_MAP_SCOPES.has(scope)) {
    throw new Error('scope doit valoir territory ou activity.')
  }

  const parameters = new URLSearchParams({scope})
  if (scope === 'territory') {
    appendZoneCodes(parameters, zoneCodes)
  }

  return `?${parameters.toString()}`
}
