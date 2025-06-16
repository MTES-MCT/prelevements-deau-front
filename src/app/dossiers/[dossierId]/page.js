import {getDossier, getFile} from '@/app/api/dossiers.js'
import {getPreleveur} from '@/app/api/points-prelevement.js'
import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {getPointsPrelevementId} from '@/lib/dossier.js'
import {getDossierDSURL} from '@/lib/urls.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params

  const dossier = await getDossier(dossierId)

  if (dossier.code === 404) {
    return <div>Dossier non trouvable</div>
  }

  let files = null
  if (dossier.files && dossier.files.length > 0) {
    files = await Promise.all(dossier.files.map(async file => {
      const [hash] = file.storageKey.split('-')
      const fileResult = await getFile(dossierId, hash)
      if (fileResult) {
        // Read raw text and attempt JSON parse
        const rawText = await fileResult.text()
        let data
        try {
          data = JSON.parse(rawText)
        } catch {
          data = rawText
        }

        data.pointsPrelevements = dossier.donneesPrelevements ? dossier.donneesPrelevements.find(point => point.fichier.storageKey === file.storageKey).pointsPrelevements : []

        return data
      }

      return null
    }))
  }

  let preleveur = dossier?.demandeur
  if (dossier?.result?.preleveur) {
    const response = await getPreleveur(dossier.result.preleveur)
    if (response?._id) {
      preleveur = response
    }
  }

  return (
    <>
      <DossierHeader
        numero={dossier.number}
        status={dossier.status}
        dateDepot={dossier.dateDepot}
        dsUrl={getDossierDSURL(dossierId)}
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

