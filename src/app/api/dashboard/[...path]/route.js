import {authenticatedFetch} from '@/server/api-wrapper.js'
import {getServerAuthSession} from '@/server/auth.js'
import {getDashboardResponse} from '@/server/dashboard-response.js'

export const dynamic = 'force-dynamic'

export async function GET(request, {params}) {
  const {path} = await params
  return getDashboardResponse(request, {
    path: path.join('/'),
    session: await getServerAuthSession(),
    fetchUpstream: authenticatedFetch
  })
}
