import {
  getBss,
  getBnpe,
  getPointPrelevement,
  getLibelleCommune
} from '../../api/points-prelevement.js'

import PointPrelevement from '@/components/point-prelevement/index.js'

const Page = async ({params}) => {
  const {slug} = (await params)
  const pointPrelevement = await getPointPrelevement(slug)
  const bss = await getBss(pointPrelevement.id_bss)
  const bnpe = await getBnpe(pointPrelevement.code_bnpe)
  const commune = await getLibelleCommune(pointPrelevement.insee_com)

  return (
    <PointPrelevement
      pointPrelevement={pointPrelevement}
      lienInfoterre={bss?.lien_infoterre || ''}
      lienOuvrageBnpe={bnpe?.uri_ouvrage || ''}
      commune={commune?.nom || ''}
    />
  )
}

export default Page
