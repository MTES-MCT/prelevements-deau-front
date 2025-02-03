import {getPointsPrelevement} from '@/app/api/points-prelevement.js'
import MapContainer from '@/components/map/map-container.js'
import {extractTypeMilieu, extractUsages} from '@/lib/points-prelevement.js'

const Page = async () => {
  const points = await getPointsPrelevement()

  return (
    <MapContainer
      points={points}
      typeMilieuOptions={extractTypeMilieu(points)}
      usagesOptions={extractUsages(points)}
    />
  )
}

export default Page
