import {notFound} from 'next/navigation'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationHeader from '@/components/declarations/declaration-header.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
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

      <DeclarationHeader
        numero={declaration.code}
        status={source.globalInstructionStatus}
        dateDepot={declaration.createdAt}
        periodLabel={periodLabel}
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
