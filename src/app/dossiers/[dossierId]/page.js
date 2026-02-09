import {notFound} from 'next/navigation'

import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDossierFiles, getPointsPrelementIdFromDossier, getDossierPeriodLabel} from '@/lib/dossier.js'
import {getDossierDSURL} from '@/lib/urls.js'
import {getDossierAction, getPreleveurAction} from '@/server/actions/index.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params

  const dossierResult = await getDossierAction(dossierId)
  if (!dossierResult.success || !dossierResult.data) {
    notFound()
  }

  const dossier = dossierResult.data
  const files = await getDossierFiles(dossier)
  const idPoints = getPointsPrelementIdFromDossier(dossier, files)
  const periodLabel = getDossierPeriodLabel(dossier)

  let preleveur = dossier?.demandeur
  if (dossier?.result?.preleveur) {
    try {
      const preleveurResult = await getPreleveurAction(dossier.result.preleveur)
      // Only assign if the request was successful
      if (preleveurResult.success) {
        preleveur = preleveurResult.data
      }
    } catch {}
  }

  return (
    <>
      <StartDsfrOnHydration />

      <DossierHeader
        numero={dossier.id}
        status={dossier.status}
        dateDepot={dossier.createdAt}
        periodLabel={periodLabel}
        dsUrl={getDossierDSURL(dossier)}
      />

      <DossierDetails
        declaration={dossier}
        files={files}
        preleveur={preleveur}
        idPoints={idPoints}
      />
    </>
  )
}

export default DossierPage
