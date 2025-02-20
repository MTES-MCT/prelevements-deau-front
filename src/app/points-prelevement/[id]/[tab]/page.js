import {
  getBeneficiaire,
  getBnpe,
  getBss,
  getExploitationsFromPointId,
  getLibelleCommune,
  getPointPrelevement
} from '@/app/api/points-prelevement.js'
import PointExploitations from '@/components/points-prelevement/point-exploitations.js'
import PointIdentification from '@/components/points-prelevement/point-identification.js'
import PointLocalistation from '@/components/points-prelevement/point-localisation.js'
import PointTabs from '@/components/points-prelevement/point-tabs.js'

const Page = async ({params}) => {
  const {id, tab} = (await params)
  const selectedTab = tab || 'identification'
  const pointPrelevement = await getPointPrelevement(id)
  const bss = await getBss(pointPrelevement.id_bss)
  const bnpe = await getBnpe(pointPrelevement.code_bnpe)
  const commune = await getLibelleCommune(pointPrelevement.insee_com)
  const exploitations = await getExploitationsFromPointId(pointPrelevement.id_point)
  const exploitationsWithBeneficiaires = await Promise.all(exploitations.map(async exploitation => {
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
      <PointTabs selectedTab={selectedTab} />
      {selectedTab === 'identification' && (
        <PointIdentification
          pointPrelevement={pointPrelevement}
        />
      )}
      {selectedTab === 'localisation' && (
        <PointLocalistation
          pointPrelevement={pointPrelevement}
        />
      )}
      {selectedTab === 'exploitations' && (
        <PointExploitations
          pointPrelevement={pointPrelevement}
        />
      )}
    </div>
  )
}

export default Page
