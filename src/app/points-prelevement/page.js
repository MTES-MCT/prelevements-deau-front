import PointsMapPage from '@/app/points-prelevement/points-map-page.js'
import {getPointMapSummariesAction} from '@/server/actions/points-prelevement.js'
import {getMyCollectorPointManagementAction} from '@/server/actions/collector-points.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const pointsPromise = getPointMapSummariesAction()
  const session = await getCurrentSessionInfo()
  const management = session?.data?.declarantRole === 'COLLECTEUR'
    ? await getMyCollectorPointManagementAction()
    : null
  const initialPointsResult = await pointsPromise

  return <PointsMapPage initialPointsResult={initialPointsResult} canCreateCollectorPoint={management?.data?.enabled === true} />
}

export default Page
