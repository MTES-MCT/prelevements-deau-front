import {buildChartSeriesQuery} from '@/lib/chart-series.js'

const headers = {'Cache-Control': 'private, no-store'}

export async function getChartSeriesResponse(request, {session, fetchUpstream}) {
  const expiresAt = session?.user?.apiExpiresAt ?? session?.expires
  const expiry = expiresAt ? new Date(expiresAt).getTime() : null
  if (!session?.user?.token || (expiresAt && (!Number.isFinite(expiry) || expiry <= Date.now()))) {
    return Response.json({message: 'Session expirée'}, {status: 401, headers})
  }

  const query = buildChartSeriesQuery(new URL(request.url).searchParams)
  try {
    const response = await fetchUpstream(`api/aggregated-series?${query}`, {signal: request.signal})
    const performanceHeaders = {}
    for (const name of ['Server-Timing', 'X-Request-Id']) {
      const value = response.headers.get(name)
      if (value) performanceHeaders[name] = value
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...headers,
        ...performanceHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json'
      }
    })
  } catch (error) {
    if (request.signal.aborted || error.name === 'AbortError') return new Response(null, {status: 499, headers})
    const status = error.code === 401 ? 401 : error.code === 403 ? 403 : 502
    return Response.json({message: status === 401 ? 'Session expirée' : 'Impossible de charger les séries agrégées'}, {status, headers})
  }
}
