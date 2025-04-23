import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import PointLocalisation from '@/components/prelevements/point-localisation.js'

const Page = async ({params}) => {
  const {id} = (await params)
  const pointPrelevement = await getPointPrelevement(id)

  return (
    <PointLocalisation
      pointPrelevement={pointPrelevement}
    />
  )
}

export default Page
