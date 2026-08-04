import PointsMapPage from '@/app/points-prelevement/points-map-page.js'
import {getPointMapSummariesAction} from '@/server/actions/points-prelevement.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const initialPointsResult = await getPointMapSummariesAction()

  return <PointsMapPage initialPointsResult={initialPointsResult} />
}

export default Page
