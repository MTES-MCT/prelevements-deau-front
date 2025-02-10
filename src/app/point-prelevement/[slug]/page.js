import {getBss, getBnpe, getPointPrelevement} from '../../api/points-prelevement.js'

import PointPrelevement from '@/components/point-prelevement/index.js'

const Page = async ({params}) => {
  const {slug} = (await params)
  const pointPrelevement = await getPointPrelevement(slug)
  const bss = await getBss(pointPrelevement.id_bss)
  const bnpe = await getBnpe(pointPrelevement.code_bnpe)

  return (
    <PointPrelevement
      pointPrelevement={pointPrelevement}
      lienInfoterre={bss?.lien_infoterre || ''}
      lienOuvrageBnpe={bnpe?.uri_ouvrage || ''}
    />
  )
}

export default Page
