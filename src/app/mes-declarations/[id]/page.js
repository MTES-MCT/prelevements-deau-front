import {notFound} from 'next/navigation'

import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDossierFiles, getDossierPeriodLabel, getPointsPrelevementIdsFromDeclaration} from '@/lib/dossier.js'
import {getDeclarationAction} from '@/server/actions/declarations.js'

const Page = async ({params}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data
  const files = await getDossierFiles(declaration)
  const idPoints = getPointsPrelevementIdsFromDeclaration(declaration, files)
  const periodLabel = getDossierPeriodLabel(declaration)

  return (
    <>
      <StartDsfrOnHydration />

      <DossierHeader
        numero={declaration.code}
        status={declaration.status}
        dateDepot={declaration.createdAt}
        periodLabel={periodLabel}
      />

      <DossierDetails
        declaration={declaration}
        files={files}
        idPoints={idPoints}
      />
    </>
  )
}

export default Page
