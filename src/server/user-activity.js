const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff'
}

async function hasEmptyBody(body) {
  if (!body) {
    return true
  }

  // Next represents an empty POST as a stream too. Read only until its first
  // non-empty chunk, and bound the wait for a client that never finishes it.
  const reader = body.getReader()
  let timeoutId
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const {done, value} = await reader.read()
          if (done) {
            return true
          }

          if (value?.byteLength) {
            return false
          }
        }
      })(),
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve(false), 1000)
      })
    ])
  } finally {
    clearTimeout(timeoutId)
    void reader.cancel().catch(() => {})
  }
}

export function isSameOriginActivityRequest(request) {
  if (request.headers.get('x-activity-signal') !== '1') {
    return false
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    return false
  }

  try {
    const origin = new URL(request.headers.get('origin'))
    const requestUrl = new URL(request.url)
    // Match Next's proxy-aware host checking; the custom header also prevents
    // a cross-origin HTML form from triggering this cookie-authenticated POST.
    const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
      || request.headers.get('host')
      || requestUrl.host
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
      || requestUrl.protocol.slice(0, -1)

    return origin.origin === `${protocol}://${host}`
  } catch {
    return false
  }
}

export function createUserActivityHandler({
  requestActivity,
  logError = console.error,
  now = Date.now
}) {
  let lastFailureLoggedAt = -Infinity

  const fail = status => {
    if (status >= 500 && now() - lastFailureLoggedAt >= 60_000) {
      lastFailureLoggedAt = now()
      logError('[User activity] Collecte indisponible', {status})
    }

    return Response.json({message: 'Activité non enregistrée.'}, {
      status,
      headers: RESPONSE_HEADERS
    })
  }

  return async request => {
    if (!isSameOriginActivityRequest(request)) {
      return fail(403)
    }

    // No browser-supplied identity, role or month is accepted or forwarded.
    try {
      if (!await hasEmptyBody(request.body)) {
        return fail(400)
      }

      const response = await requestActivity({
        method: 'POST',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return fail([401, 403].includes(response.status) ? response.status : 503)
      }

      const data = await response.json()
      if (!MONTH_PATTERN.test(data?.month || '')) {
        return fail(503)
      }

      return Response.json({month: data.month}, {headers: RESPONSE_HEADERS})
    } catch (error) {
      return fail([401, 403].includes(error.code) ? error.code : 503)
    }
  }
}
