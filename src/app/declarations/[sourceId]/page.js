import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  buildDeclarationViewFromSource,
  getSourcePeriodLabel,
  getPointsPrelevementIdsFromSource,
  isPointReconciliationRelevant
} from '@/lib/declaration.js'
import {getAvailablePointsPrelevementsForDeclarationAction} from '@/server/actions/declarations.js'
import {getMySourceAction} from '@/server/actions/sources.js'

function getDeclarationTitleFromSource(source) {
  const declaration = buildDeclarationViewFromSource(source)
  return declaration.code ? `Déclaration n°${declaration.code}` : declaration.title
}

export async function generateMetadata({params}) {
  const {sourceId} = await params
  const result = await getMySourceAction(sourceId)
  const source = result.success ? result.data?.data : null

  return buildPageTitle([
    source && getDeclarationTitleFromSource(source),
    source && getSourcePeriodLabel(source)
  ], 'Détail de déclaration')
}

const SourcePage = async ({params}) => {
  const {sourceId} = await params

  const result = await getMySourceAction(sourceId)
  if (!result.success || !result.data) {
    notFound()
  }

  const source = result.data.data
  const declaration = buildDeclarationViewFromSource(source)
  const idPoints = getPointsPrelevementIdsFromSource(source)
  const periodLabel = getSourcePeriodLabel(source)
  const shouldLoadAvailablePoints = isPointReconciliationRelevant(declaration, source)

  const availablePointsResult = shouldLoadAvailablePoints
    ? await getAvailablePointsPrelevementsForDeclarationAction(declaration.id)
    : null
  if (shouldLoadAvailablePoints && (!availablePointsResult.success || !availablePointsResult.data)) {
    notFound()
  }

  const availablePoints = availablePointsResult?.data?.data ?? []

  return (
    <>
      <StartDsfrOnHydration />

      <DeclarationOverview
        declaration={declaration}
        status={source.globalInstructionStatus}
        periodLabel={periodLabel}
        preleveurName={declaration.declarant ? getDeclarantTitleFromDeclarant(declaration.declarant) : null}
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
