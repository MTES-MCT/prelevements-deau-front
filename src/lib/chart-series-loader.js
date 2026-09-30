import {buildChartSeriesQuery, loadChartSeries} from './chart-series.js'

export function indexInitialChartSeries(initialSeries = []) {
  return new Map(initialSeries.flatMap(entry => (
    entry?.query && entry.response
      ? [[buildChartSeriesQuery(typeof entry.query === 'string' ? new URLSearchParams(entry.query) : entry.query), entry.response]]
      : []
  )))
}

function validateResponse(response) {
  if (response?.error) throw Object.assign(new Error(response.error), {code: response.code})
  if (!Array.isArray(response?.values)) throw new Error('Réponse des séries agrégées invalide')
  return response
}

async function resolveResponse(query, initial, load, signal) {
  if (initial.has(query)) {
    try {
      return validateResponse(await initial.get(query))
    } catch (error) {
      // One transient preload failure must not poison this query for the
      // lifetime of the page. Retry once through the authenticated browser
      // route; never retry a permission/validation error or an obsolete scope.
      if (signal?.aborted || error?.name === 'AbortError' || (error?.code && error.code < 500)) throw error
    }
  }
  return validateResponse(await load(query, {signal}))
}

/** Publish each completed parameter independently, without mixing request scopes. */
export async function loadChartSeriesProgressively({
  requests, initialSeries, signal, onUpdate, onError, load = loadChartSeries
}) {
  const initial = indexInitialChartSeries(initialSeries)
  const series = new Map()
  const errors = new Map()
  const pending = new Set(requests.map(([parameterId]) => parameterId))
  const byQuery = new Map()
  let sessionExpired = false
  const publish = () => {
    if (!signal?.aborted) onUpdate({series: new Map(series), errors: new Map(errors), pending: [...pending]})
  }
  for (const [parameterId, query] of requests) {
    if (Array.isArray(initial.get(query)?.values)) {
      series.set(parameterId, initial.get(query))
      pending.delete(parameterId)
    } else {
      if (!byQuery.has(query)) byQuery.set(query, [])
      byQuery.get(query).push(parameterId)
    }
  }
  publish()
  await Promise.all([...byQuery].map(async ([query, parameterIds]) => {
    try {
      const response = await resolveResponse(query, initial, load, signal)
      if (signal?.aborted || sessionExpired) return
      for (const parameterId of parameterIds) series.set(parameterId, {
        ...response,
        metadata: {...response.metadata, frequency: response.metadata?.frequency ?? new URLSearchParams(query).get('aggregationFrequency')}
      })
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError' || sessionExpired) return
      // An expired session invalidates the whole view, unlike one unavailable
      // parameter, which must not hide independently authorized ready series.
      if (error?.code === 401) {
        sessionExpired = true
        series.clear()
        pending.clear()
      }
      for (const parameterId of parameterIds) errors.set(parameterId, error)
      onError?.(error)
    } finally {
      for (const parameterId of parameterIds) pending.delete(parameterId)
      publish()
    }
  }))
}
