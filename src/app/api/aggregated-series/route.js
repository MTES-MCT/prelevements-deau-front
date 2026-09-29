import {authenticatedFetch} from '@/server/api-wrapper.js'
import {getServerAuthSession} from '@/server/auth.js'
import {getChartSeriesResponse} from '@/server/chart-series-response.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  return getChartSeriesResponse(request, {
    session: await getServerAuthSession(),
    fetchUpstream: authenticatedFetch
  })
}
