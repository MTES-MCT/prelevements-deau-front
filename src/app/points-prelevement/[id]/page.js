import {
  getBss,
  getBnpe,
  getPointPrelevement,
  getLibelleCommune,
  getBeneficiaire
} from '@/app/api/points-prelevement.js'
import PointPrelevement from '@/components/points-prelevement/index.js'

const Page = async ({params}) => {
  const {id} = (await params)
  const pointPrelevement = await getPointPrelevement(id)
  const bss = await getBss(pointPrelevement.id_bss)
  const bnpe = await getBnpe(pointPrelevement.code_bnpe)
  const commune = await getLibelleCommune(pointPrelevement.insee_com)
  const exploitationsWithBeneficiaires = await Promise.all(pointPrelevement.exploitations.map(async exploitation => {
    const beneficiaire = await getBeneficiaire(exploitation.id_beneficiaire)
    return {
      ...exploitation,
      beneficiaire
    }
  }))

  pointPrelevement.lienBss = bss?.lien_infoterre || ''
  pointPrelevement.lienBnpe = bnpe?.uri_ouvrage || ''
  pointPrelevement.libelleCommune = commune?.nom || ''
  pointPrelevement.exploitations = exploitationsWithBeneficiaires

  return (
    <div className='fr-container mt-4'>
      <PointPrelevement
        pointPrelevement={pointPrelevement}
      />
    </div>
  )
}

export default Page
