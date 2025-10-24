import {notFound} from 'next/navigation'

import {getDossier} from '@/app/api/dossiers.js'
import {getPreleveur} from '@/app/api/points-prelevement.js'
import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDossierFiles, getPointsPrelementIdFromDossier, getDossierPeriodLabel} from '@/lib/dossier.js'
import {getDossierDSURL} from '@/lib/urls.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params

  const dossier = await getDossier(dossierId)
  if (!dossier) {
    notFound()
  }

  const files = await getDossierFiles(dossier)
  const idPoints = getPointsPrelementIdFromDossier(dossier, files)
  const periodLabel = getDossierPeriodLabel(dossier)

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
        numero={dossier.ds.dossierNumber}
        status={dossier.status}
        dateDepot={dossier.dateDepot}
        periodLabel={periodLabel}
        dsUrl={getDossierDSURL(dossier)}
      />

      <DossierDetails
        dossier={dossier}
        files={files}
        preleveur={preleveur}
        idPoints={idPoints}
      />
    </>
  )
}

export default DossierPage
