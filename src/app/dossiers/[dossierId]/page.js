import {getDossier, getFile} from '@/app/api/dossiers.js'
import {getPreleveur} from '@/app/api/points-prelevement.js'
import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementId} from '@/lib/dossier.js'
import {getDossierDSURL} from '@/lib/urls.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params

  const dossier = await getDossier(dossierId)

  let files = null
  if (dossier.files && dossier.files.length > 0) {
    files = await Promise.all(dossier.files.map(async file => {
      const [hash] = file.storageKey.split('-')
      const data = await getFile(dossierId, hash)

      data.pointsPrelevements = dossier.donneesPrelevements ? dossier.donneesPrelevements.find(point => point.fichier.storageKey === file.storageKey).pointsPrelevements : []

      return data
    }))
  }

  let preleveur = dossier?.demandeur
  if (dossier?.result?.preleveur) {
    try {
      preleveur = await getPreleveur(dossier.result.preleveur)
    } catch {}
  }

  return (
    <>
      <StartDsfrOnHydration />

      <DossierHeader
        numero={dossier.number}
        status={dossier.status}
        moisDeclaration={dossier.moisDeclaration}
        dateDepot={dossier.dateDepot}
        dsUrl={getDossierDSURL(dossier)}
      />

      <DossierDetails
        dossier={dossier}
        files={files || []}
        preleveur={preleveur}
        idPoints={getPointsPrelevementId(dossier)}
      />
    </>
  )
}

export default DossierPage
