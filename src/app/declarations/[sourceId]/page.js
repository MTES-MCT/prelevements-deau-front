import {notFound} from 'next/navigation'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getSourcePeriodLabel,
  getPointsPrelevementIdsFromSource
} from '@/lib/declaration.js'
import {getAvailablePointsPrelevementsForDeclarationAction} from '@/server/actions/declarations.js'
import {getMySourceAction} from '@/server/actions/sources.js'

const SourcePage = async ({params}) => {
  const {sourceId} = await params

  const result = await getMySourceAction(sourceId)
  if (!result.success || !result.data) {
    notFound()
  }

  const source = result.data.data
  const {declaration} = source
  const idPoints = getPointsPrelevementIdsFromSource(source)
  const periodLabel = getSourcePeriodLabel(source)

  const availablePointsResult = await getAvailablePointsPrelevementsForDeclarationAction(declaration.id)
  if (!availablePointsResult.success || !availablePointsResult.data) {
    notFound()
  }

  const availablePoints = availablePointsResult.data.data

  return (
    <>
      <StartDsfrOnHydration />

      <DeclarationOverview
        declaration={declaration}
        status={source.globalInstructionStatus}
        periodLabel={periodLabel}
        preleveurName={getDeclarantTitleFromDeclarant(declaration.declarant)}
      />

      <DeclarationDetails
        isInstructor
        declaration={declaration}
        idPoints={idPoints}
        source={source}
        availablePoints={availablePoints}
      />
    </>
  )
}

export default SourcePage
