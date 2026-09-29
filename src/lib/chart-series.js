import {loadMeterSeriesPages} from '@/components/points-prelevement/meter-series.js'
import {normalizeDate} from '@/utils/time.js'

const QUERY_KEYS = [
  'aggregationFrequency', 'collecteurId', 'cursor', 'endDate', 'exploitationId',
  'limit', 'meterId', 'metricTypeCode', 'pointFlowType', 'pointIds', 'preleveurId',
  'sourceId', 'startDate', 'temporalOperator', 'territoire'
]

/** The canonical query is also the identity of a chart request. */
export function buildChartSeriesQuery(options = {}) {
  const query = new URLSearchParams()
  const read = key => options instanceof URLSearchParams ? options.get(key) : options[key]

  for (const key of QUERY_KEYS) {
    let value = read(key)
    if (key === 'startDate' || key === 'endDate') value = normalizeDate(value)
    if (key === 'pointIds' && value) {
      const ids = Array.isArray(value) ? value : String(value).split(',')
      value = [...new Set(ids.map(id => String(id).trim()).filter(Boolean))].sort().join(',')
    }
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }

  // This endpoint is intentionally only the compact, authenticated chart view.
  query.set('view', 'chart')
  return query.toString()
}

export async function fetchChartSeries(query, {signal, fetchImpl = fetch} = {}) {
  signal?.throwIfAborted()
  const response = await fetchImpl(`/api/aggregated-series?${query}`, {
    credentials: 'same-origin', cache: 'no-store', signal
  })
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    // HTTP status remains authoritative when a proxy returns an HTML error.
    if (response.ok) throw new Error('Réponse des séries agrégées invalide')
  }
  signal?.throwIfAborted()
  if (!response.ok) {
    const message = response.status === 401 ? 'Votre session a expiré. Reconnectez-vous pour charger les données.'
      : response.status === 403 ? 'Vous ne pouvez pas consulter les données de ce périmètre.'
        : data?.message || 'Impossible de charger les séries agrégées'
    throw Object.assign(new Error(message), {code: response.status})
  }
  signal?.throwIfAborted()
  return data
}

export function loadChartSeries(query, options = {}) {
  const params = new URLSearchParams(query)
  if (params.get('aggregationFrequency') !== 'instantaneous' || !params.has('meterId')) {
    return fetchChartSeries(query, options)
  }
  return loadMeterSeriesPages(pagination => {
    options.signal?.throwIfAborted()
    const page = new URLSearchParams(query)
    for (const [key, value] of Object.entries(pagination)) page.set(key, String(value))
    return fetchChartSeries(page.toString(), options)
  })
}
