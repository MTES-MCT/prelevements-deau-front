import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarationAdminActions from '@/components/declarations/declaration-admin-actions.js'
import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  buildDeclarationViewFromSource,
  getDeclarationDisplayStatus,
  getSourcePeriodLabel,
  getPointsPrelevementIdsFromSource,
  isPointReconciliationRelevant
} from '@/lib/declaration.js'
import {getAvailablePointsPrelevementsForDeclarationAction} from '@/server/actions/declarations.js'
import {getMySourceAction} from '@/server/actions/sources.js'
import {getCurrentUser} from '@/server/actions/user.js'

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

  const [result, userResult] = await Promise.all([
    getMySourceAction(sourceId),
    getCurrentUser()
  ])

  if (!result.success || !result.data) {
    notFound()
  }

  const source = result.data.data
  const currentRole = userResult?.data?.role ?? null
  const declaration = buildDeclarationViewFromSource(source)
  const displayStatus = getDeclarationDisplayStatus(declaration, source)
  const idPoints = getPointsPrelevementIdsFromSource(source)
  const periodLabel = getSourcePeriodLabel(source)
  const shouldLoadAvailablePoints = source.status === 'COMPLETED'
    && isPointReconciliationRelevant(declaration, source)
  const canReconcile = ['INSTRUCTOR', 'ADMIN'].includes(currentRole)
  const canAdminManageDeclaration = currentRole === 'ADMIN' && Boolean(source.declaration?.id)
  const canReplayDeclaration = canAdminManageDeclaration
    && (source.declaration?.files?.length ?? 0) > 0

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
        showDeclarant
        declaration={declaration}
        source={source}
        status={displayStatus}
        periodLabel={periodLabel}
        declarantName={declaration.declarant ? getDeclarantTitleFromDeclarant(declaration.declarant) : null}
        actions={
          canAdminManageDeclaration
            ? (
              <DeclarationAdminActions
                canReplay={canReplayDeclaration}
                declarationCode={declaration.code}
                declarationId={declaration.id}
                sourceId={source.id}
              />
            )
            : null
        }
      />

      <DeclarationDetails
        isInstructor
        availablePoints={availablePoints}
        canReconcile={canReconcile}
        declaration={declaration}
        idPoints={idPoints}
        source={source}
      />
    </>
  )
}

export default SourcePage
