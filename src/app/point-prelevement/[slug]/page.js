import {
  getBss,
  getBnpe,
  getPointPrelevement,
  getLibelleCommune,
  getExploitationsFromPointId
} from '../../api/points-prelevement.js'

import PointPrelevement from '@/components/point-prelevement/index.js'

const Page = async ({params}) => {
  const {slug} = (await params)
  const pointPrelevement = await getPointPrelevement(slug)
  const bss = await getBss(pointPrelevement.id_bss)
  const bnpe = await getBnpe(pointPrelevement.code_bnpe)
  const commune = await getLibelleCommune(pointPrelevement.insee_com)
  const exploitations = await getExploitationsFromPointId(pointPrelevement.id_point)

  pointPrelevement.lienBss = bss?.lien_infoterre || ''
  pointPrelevement.lienBnpe = bnpe?.uri_ouvrage || ''
  pointPrelevement.libelleCommune = commune?.nom || ''
  pointPrelevement.exploitations = exploitations

  return (
    <PointPrelevement
      pointPrelevement={pointPrelevement}
    />
  )
}

export default Page
