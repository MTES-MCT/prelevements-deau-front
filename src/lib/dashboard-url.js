const FILTER_KEYS = ['zones', 'periodType', 'period', 'year', 'waterBodyTypes', 'waterBodyType']

export function readLegacyDashboardHash(location) {
  if (!location.hash.startsWith('#dashboard?')) return null
  const query = new URLSearchParams(location.search)
  // A query URL is authoritative; resource controls may still use the fragment.
  if (FILTER_KEYS.some(key => query.has(key))) return null
  const hash = new URLSearchParams(location.hash.slice('#dashboard?'.length))
  return FILTER_KEYS.some(key => hash.has(key)) ? location.hash : null
}

export function buildDashboardLocation(location, {period, periodType, waterBodyTypes, year, zoneCodes}) {
  const query = new URLSearchParams(location.search)
  for (const key of FILTER_KEYS) query.delete(key)
  if (zoneCodes?.length) query.set('zones', zoneCodes.join(','))
  if (periodType) query.set('periodType', periodType)
  if (period) query.set('period', period)
  if (year) query.set('year', String(year))
  if (Array.isArray(waterBodyTypes)) query.set('waterBodyTypes', waterBodyTypes.length ? waterBodyTypes.join(',') : '__none__')
  let hash = location.hash
  if (hash.startsWith('#dashboard?')) {
    const parameters = new URLSearchParams(hash.slice('#dashboard?'.length))
    for (const key of FILTER_KEYS) parameters.delete(key)
    hash = parameters.size ? `#dashboard?${parameters}` : ''
  }
  return `${location.pathname}${query.size ? `?${query}` : ''}${hash}`
}
