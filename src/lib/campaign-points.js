export function campaignResponsePoint(response) {
  const point = response.point ?? response.exploitation?.pointPrelevement
  const coordinates = Array.isArray(point?.coordinates) ? point.coordinates : point?.coordinates?.coordinates
  if (!point?.id || !Array.isArray(coordinates) || coordinates.length !== 2
    || !coordinates.every(value => typeof value === 'number' && Number.isFinite(value))
    || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) return null
  return {...point, coordinates: {type: 'Point', coordinates}}
}

export function campaignMapPoints(responses) {
  return [...new Map(responses.map(campaignResponsePoint).filter(Boolean).map(point => [point.id, point])).values()]
}

export function campaignResponseForPoint(responses, pointId, selectedId) {
  const matches = responses.filter(response => (response.point?.id ?? response.exploitation?.pointPrelevement?.id) === pointId)
  return matches.find(response => response.id === selectedId) ?? matches[0] ?? null
}

export async function loadCampaignMapResponses(initialPage, fetchPage) {
  if ((initialPage.page ?? 1) === 1 && initialPage.items.length >= initialPage.total) return initialPage.items
  const responses = new Map()
  const pageSize = 200
  let total = initialPage.total
  for (let page = 1; (page - 1) * pageSize < total; page++) {
    // Every page uses the same authorized summary route as the visible list.
    const result = await fetchPage({page, pageSize, view: 'summary'})
    total = result.total
    for (const response of result.items) responses.set(response.id, response)
    if (!result.items.length) break
  }
  return [...responses.values()]
}
