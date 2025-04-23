import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import PointIdentification from '@/components/prelevements/point-identification.js'

const Page = async ({params}) => {
  const {id} = (await params)
  const pointPrelevement = await getPointPrelevement(id)

  return (
    <PointIdentification
      pointPrelevement={pointPrelevement}
      lienBss={pointPrelevement.bss?.lien || ''}
      lienBnpe={pointPrelevement.bnpe?.lien || ''}
    />
  )
}

export default Page
