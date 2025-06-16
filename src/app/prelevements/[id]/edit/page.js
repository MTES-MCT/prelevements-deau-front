import {
  getBnpe,
  getBvBdcarthage,
  getMeContinentales,
  getMeso,
  getPointPrelevement
} from '@/app/api/points-prelevement.js'
import PointEditionForm from '@/components/form/point-edition-form.js'

const Page = async ({params}) => {
  const {id} = await params
  const pointPrelevement = await getPointPrelevement(id)
  const bnpeList = await getBnpe()
  const mesoList = await getMeso()
  const meContinentalesBvList = await getMeContinentales()
  const bvBdCarthageList = await getBvBdcarthage()

  return (
    <PointEditionForm
      pointPrelevement={pointPrelevement}
      bnpeList={bnpeList}
      bvBdCarthageList={bvBdCarthageList}
      mesoList={mesoList}
      meContinentalesBvList={meContinentalesBvList}
    />
  )
}

export default Page
