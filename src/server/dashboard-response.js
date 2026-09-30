const headers = {'Cache-Control': 'private, no-store'}
const queries = {
  territory: ['zones', 'period', 'periodType', 'year', 'waterBodyType', 'waterBodyTypes', 'sections'],
  map: ['scope', 'zones'],
  'water-resources/piezometry': ['zones', 'period', 'includeIps'],
  'water-resources/flows': ['zones', 'period']
}

export async function getDashboardResponse(request, {path, session, fetchUpstream}) {
  const expiresAt = session?.user?.apiExpiresAt ?? session?.expires
  const expiry = expiresAt ? new Date(expiresAt).getTime() : null
  if (!session?.user?.token || (expiresAt && (!Number.isFinite(expiry) || expiry <= Date.now()))) {
    return Response.json({message: 'Session expirée'}, {status: 401, headers})
  }
  const keys = Object.hasOwn(queries, path) ? queries[path] : (/^map\/points\/[a-zA-Z0-9_-]+\/actors$/.test(path) ? [] : null)
  if (!keys) return Response.json({message: 'Lecture inconnue'}, {status: 404, headers})
  const incoming = new URL(request.url).searchParams
  const query = new URLSearchParams()
  for (const key of keys) {
    if (incoming.has(key)) query.set(key, incoming.get(key))
  }
  if (path === 'territory') query.set('includePoints', 'false')
  try {
    const response = await fetchUpstream(`api/dashboard/${path}${query.size ? `?${query}` : ''}`, {
      signal: request.signal,
      cache: 'no-store'
    })
    const performanceHeaders = {}
    for (const name of ['Server-Timing', 'X-Request-Id']) {
      const value = response.headers.get(name)
      if (value) performanceHeaders[name] = value
    }
    return new Response(response.body, {
      status: response.status,
      headers: {...headers, ...performanceHeaders, 'Content-Type': response.headers.get('Content-Type') || 'application/json'}
    })
  } catch (error) {
    if (request.signal.aborted || error.name === 'AbortError') return new Response(null, {status: 499, headers})
    const status = error.code === 401 ? 401 : error.code === 403 ? 403 : 502
    return Response.json({message: status === 401 ? 'Session expirée' : 'Impossible de charger le tableau de bord.'}, {status, headers})
  }
}
