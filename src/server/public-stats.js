import {getPublicStatsUrl} from '../lib/public-stats.js'

const MAX_SNAPSHOT_AGE_MS = 65 * 60 * 1000

// The URL month is shared by territories and collection channels. Keep totals
// and the activity/visitor series on the latest snapshot.
export async function getPublicStatsPage(month, options) {
  const latest = await getPublicStats(undefined, options)
  const selected = month === undefined || month === null || month === '' || month === latest.data?.month
    ? latest
    : await getPublicStats(month, options)

  return {
    ...latest,
    periodData: selected.data,
    periodError: selected === latest ? null : selected.error,
    periodMonth: selected.data?.month
      ?? (latest.data?.availableMonths?.includes(month) ? month : latest.data?.month)
  }
}

export async function getPublicStats(month, {
  apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
  fetchImpl = fetch,
  now = Date.now
} = {}) {
  try {
    const url = getPublicStatsUrl(apiUrl, month)
    // Share the deadline so recovering from an expired snapshot cannot double
    // the maximum wait for the page.
    const signal = AbortSignal.timeout(15_000)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {Accept: 'application/json'},
        credentials: 'omit',
        // Keep the shared cache to protect the API rate limit. After inactivity,
        // Next may return an expired snapshot while revalidating in the background.
        // Await one fresh read instead of asking the visitor to reload the page.
        ...(attempt === 0 ? {next: {revalidate: 60}} : {cache: 'no-store'}),
        signal
      })

      if (!response.ok) {
        return {data: null, error: response.status === 400 ? 'invalid-month' : 'unavailable'}
      }

      const data = await response.json()
      if (!data || !data.totals || !data.territories || !Array.isArray(data.channels)) {
        return {data: null, error: 'unavailable'}
      }

      // Keep the freshness guard on both reads: a real outage must not display
      // old figures as current statistics.
      const generatedAt = data.generatedAt ? Date.parse(data.generatedAt) : Number.NaN
      if (Number.isFinite(generatedAt) && now() - generatedAt <= MAX_SNAPSHOT_AGE_MS) {
        return {data, error: null}
      }
    }

    return {data: null, error: 'unavailable'}
  } catch (error) {
    return {
      data: null,
      error: error.message === 'INVALID_STATS_MONTH' ? 'invalid-month' : 'unavailable'
    }
  }
}
