import Link from 'next/link'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarationAdminActions from '@/components/declarations/declaration-admin-actions.js'
import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationSubmissionFlash from '@/components/declarations/declaration-submission-flash.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  buildDeclarationViewFromSource,
  getDeclarationAdminCapabilities,
  getDeclarationDisplayStatus,
  getSourcePeriodLabel,
  isOnlineDeclaration,
  getPointsPrelevementIdsFromSource,
  shouldLoadAvailablePointsForDeclaration
} from '@/lib/declaration.js'
import {getAvailablePointsPrelevementsForDeclarationAction, getEditableQuickDeclarationAction} from '@/server/actions/declarations.js'
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
  const canReconcile = source.chunks?.some(chunk => chunk.canReconcile) ?? false
  const shouldLoadAvailablePoints = shouldLoadAvailablePointsForDeclaration({
    currentRole,
    declaration,
    source
  })
  const {canDelete, canReplay} = getDeclarationAdminCapabilities(source, currentRole)

  const editable = currentRole === 'ADMIN' && isOnlineDeclaration(declaration, source)
    ? await getEditableQuickDeclarationAction(declaration.id)
    : null
  const canEditQuick = editable?.success === true && editable.data?.data?.entries?.length > 0

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
      <DeclarationSubmissionFlash />

      <DeclarationOverview
        showDeclarant
        declaration={declaration}
        source={source}
        status={displayStatus}
        periodLabel={periodLabel}
        declarantName={declaration.declarant ? getDeclarantTitleFromDeclarant(declaration.declarant) : null}
        actions={(canEditQuick || canDelete || canReplay) && (
          <div className='flex flex-wrap items-center gap-2'>
            {canEditQuick && (
              <Link className='fr-btn fr-btn--secondary fr-btn--sm fr-icon-edit-line fr-btn--icon-left' href={`/saisie-en-ligne/${declaration.id}/modifier`}>
                Modifier la déclaration
              </Link>
            )}
            {(canDelete || canReplay) && (
              <DeclarationAdminActions
                canDelete={canDelete}
                canReplay={canReplay}
                declarationCode={declaration.code}
                declarationId={declaration.id}
                sourceId={source.id}
              />
            )}
          </div>
        )}
      />

      <DeclarationDetails
        isInstructor
        currentRole={currentRole}
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
