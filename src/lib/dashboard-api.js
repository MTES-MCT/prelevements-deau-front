const NO_WATER_BODY_TYPES_SENTINEL = '__none__'
const DASHBOARD_MAP_SCOPES = new Set(['activity', 'territory'])

function appendZoneSelection(parameters, {zoneCodes, zoneId}) {
  if (zoneId) parameters.set('zoneId', zoneId)
  else if (Array.isArray(zoneCodes) && zoneCodes.length > 0) {
    parameters.set('zones', zoneCodes.join(','))
  }
}

export function buildDashboardTerritorySearch(options = {}) {
  const parameters = new URLSearchParams()

  appendZoneSelection(parameters, options)

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

  if (Array.isArray(options.sections) && options.sections.length > 0) {
    parameters.set('sections', [...new Set(options.sections)].join(','))
  }

  const search = parameters.toString()
  return search ? `?${search}` : ''
}

export function buildDashboardMapSearch({scope, zoneCodes, zoneId} = {}) {
  if (!DASHBOARD_MAP_SCOPES.has(scope)) {
    throw new Error('scope doit valoir territory ou activity.')
  }

  const parameters = new URLSearchParams({scope})
  if (scope === 'territory') {
    appendZoneSelection(parameters, {zoneCodes, zoneId})
  }

  return `?${parameters.toString()}`
}

export function buildDashboardWaterResourceSearch(options = {}) {
  const parameters = new URLSearchParams()
  if (options.scope === 'activity') parameters.set('scope', 'activity')
  else appendZoneSelection(parameters, options)
  if (options.period) parameters.set('period', options.period)
  if (options.includeIps) parameters.set('includeIps', 'true')
  const search = parameters.toString()
  return search ? `?${search}` : ''
}
