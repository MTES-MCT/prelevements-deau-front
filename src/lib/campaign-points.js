export function campaignPointIdentity(response) {
  const point = response?.point ?? response?.pointPrelevement ?? response?.exploitation?.pointPrelevement
  const name = point?.usageName || point?.name || 'Point de prélèvement'
  return {
    name,
    referenceName: point?.usageName && point?.name && point.usageName !== point.name ? point.name : null,
    location: [point?.communeName, point?.locationDescription].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' · '),
    countingCode: response?.countingCode ?? response?.exploitation?.countingCode ?? null
  }
}

export function filterCampaignPointResponses(responses, {q = '', status = ''} = {}) {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').trim()
  const query = normalize(q)
  return responses.filter(response => {
    if (status && response.status !== status) return false
    if (!query) return true
    const {name, referenceName, location, countingCode} = campaignPointIdentity(response)
    return [name, referenceName, location, countingCode, response.preleveur?.socialReason].some(value => normalize(value).includes(query))
  })
}

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
