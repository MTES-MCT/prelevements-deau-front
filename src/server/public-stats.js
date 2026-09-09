import {getPublicStatsUrl} from '../lib/public-stats.js'

const MAX_SNAPSHOT_AGE_MS = 65 * 60 * 1000

export async function getPublicStats(month, {
  apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
  fetchImpl = fetch,
  now = Date.now
} = {}) {
  try {
    const response = await fetchImpl(getPublicStatsUrl(apiUrl, month), {
      method: 'GET',
      headers: {Accept: 'application/json'},
      credentials: 'omit',
      // Only public aggregates are shared. This short cache prevents all SSR
      // visitors from consuming the API rate limit through the same front IP.
      next: {revalidate: 60},
      signal: AbortSignal.timeout(15_000)
    })

    if (!response.ok) {
      return {data: null, error: response.status === 400 ? 'invalid-month' : 'unavailable'}
    }

    const data = await response.json()
    if (!data || !data.totals || !data.territories || !Array.isArray(data.channels)) {
      return {data: null, error: 'unavailable'}
    }

    // Next can serve stale cache entries when background revalidation fails.
    // Never keep presenting a frozen snapshot indefinitely during an API outage.
    const generatedAt = data.generatedAt ? Date.parse(data.generatedAt) : Number.NaN
    if (!Number.isFinite(generatedAt) || now() - generatedAt > MAX_SNAPSHOT_AGE_MS) {
      return {data: null, error: 'unavailable'}
    }

    return {data, error: null}
  } catch (error) {
    return {
      data: null,
      error: error.message === 'INVALID_STATS_MONTH' ? 'invalid-month' : 'unavailable'
    }
  }
}
