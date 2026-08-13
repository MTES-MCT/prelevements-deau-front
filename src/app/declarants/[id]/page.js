import {Suspense} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ResourceMutationHistory from '@/components/audit/resource-mutation-history.js'
import PreleveurMap from '@/components/declarants/preleveur-map.js'
import DocumentsList from '@/components/documents/documents-list.js'
import CollecteurExploitationsList from '@/components/exploitations/collecteur-exploitations-list.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import ReglesListCard from '@/components/regles/regles-list-card.js'
import EntityHeader from '@/components/ui/EntityHeader/index.js'
import Icon from '@/components/ui/Icon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {
  getDeclarantDetailExploitations,
  getDeclarantRole,
  getDeclarantSeriesScope,
  getExploitationPointId,
  getExploitationPointIds,
  hasDeclarantContactInfo
} from '@/lib/declarant-detail.js'
import {
  getDeclarantRoleLabel,
  getDeclarantTitleFromDeclarant,
  getDeclarantTypeIcon,
  getPreleveurType,
  getPreleveurTypeLabel,
  isDeclarationNotificationsEnabled
} from '@/lib/declarants.js'
import {formatFullAddress} from '@/lib/declaration.js'
import {getNewExploitationURL} from '@/lib/urls.js'
import {getResourceAuditHistoryAction} from '@/server/actions/audit-events.js'
import {
  getDeclarantOverviewAction,
  getDocumentsFromPreleveurAction,
  getReglesFromPreleveurAction
} from '@/server/actions/index.js'
import {getPointsPrelevementBatchAction} from '@/server/actions/points-prelevement.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

const iconColorStyle = {color: fr.colors.decisions.text.label.blueFrance.default}

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantOverviewAction(id)

  return buildPageTitle([result.success && result.data ? getDeclarantTitleFromDeclarant(result.data) : null], 'Fiche déclarant')
}

export const dynamic = 'force-dynamic'

function getDeclarantId(declarant) {
  return declarant.userId || declarant.id
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function getOverviewClassName(hasInfoCard, hasMap) {
  if (hasInfoCard && hasMap) {
    return 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start'
  }

  return 'grid grid-cols-1 gap-4'
}

function getExploitationsLabel(count, isCollecteur) {
  if (isCollecteur) {
    return pluralize(count, 'exploitation accessible', 'exploitations accessibles')
  }

  return pluralize(count, 'exploitation')
}

function getExploitationCreateHref(isCollecteur, declarantId) {
  if (isCollecteur) {
    return undefined
  }

  return getNewExploitationURL({idPreleveur: declarantId})
}

function getDeclarantDataPromises({
  canReadDocuments,
  canReadRules,
  canReadVolumes,
  declarantId,
  seriesScope
}) {
  return {
    documents: canReadDocuments
      ? getDocumentsFromPreleveurAction(declarantId)
      : Promise.resolve({data: []}),
    regles: canReadRules
      ? getReglesFromPreleveurAction(declarantId)
      : Promise.resolve({data: []}),
    series: canReadVolumes && seriesScope
      ? getAggregatedSeriesOptionsAction(seriesScope, {
        forbiddenOnAccessDenied: false
      })
      : Promise.resolve({data: null})
  }
}

async function getPointsById(pointIds) {
  if (pointIds.length === 0) {
    return new Map()
  }

  const pointResults = await getPointsPrelevementBatchAction(pointIds)

  if (!pointResults.success || !Array.isArray(pointResults.data)) {
    return new Map()
  }

  return new Map(pointResults.data.map(point => [point.id, point]))
}

function enrichExploitationsWithPoints(exploitations, pointsById) {
  return exploitations.map(exploitation => {
    const pointId = getExploitationPointId(exploitation)

    return {
      ...exploitation,
      pointPrelevement: pointId
        ? (pointsById.get(pointId) ?? exploitation.pointPrelevement)
        : exploitation.pointPrelevement
    }
  })
}

function getPointsPrelevement(pointIds, pointsById, exploitations) {
  return pointIds
    .map(pointId => pointsById.get(pointId) ?? exploitations.find(exploitation => getExploitationPointId(exploitation) === pointId)?.pointPrelevement)
    .filter(Boolean)
}

async function getPointData(pointsByIdPromise, pointIds, exploitations) {
  const pointsById = await pointsByIdPromise

  return {
    exploitations: enrichExploitationsWithPoints(exploitations, pointsById),
    pointsPrelevement: getPointsPrelevement(pointIds, pointsById, exploitations)
  }
}

const InfoCard = ({declarant}) => {
  if (!hasDeclarantContactInfo(declarant)) {
    return null
  }

  return (
    <SectionCard>
      <ul className='[&>li]:flex [&>li]:gap-1'>
        <li>
          <Icon iconId='ri-user-line' style={iconColorStyle} />
          <span>
            {getDeclarantTitleFromDeclarant(declarant)}
          </span>
        </li>
        <li>
          <Icon iconId='ri-at-line' style={iconColorStyle} />
          <span>{declarant.email || 'Non renseigné'}</span>
        </li>
        <li>
          <Icon iconId='ri-phone-line' style={iconColorStyle} />
          <span>{declarant.phoneNumber || 'Non renseigné'}</span>
        </li>
        <li>
          <Icon iconId='ri-home-4-line' style={iconColorStyle} />
          <span>
            {formatFullAddress(declarant) || 'Non renseignée'}
          </span>
        </li>
      </ul>
    </SectionCard>
  )
}

const SectionLoading = ({label}) => (
  <SectionCard>
    <p aria-live='polite' className='fr-text--sm mb-0 text-gray-600'>
      {label}
    </p>
  </SectionCard>
)

const SeriesUnavailable = () => (
  <SectionCard>
    <h2 className='fr-h5'>Historique des prélèvements</h2>
    <p className='fr-text--sm mb-0 text-gray-600'>
      La visualisation des volumes n’est pas disponible pour ce périmètre.
    </p>
  </SectionCard>
)

const DeclarantMap = async ({pointDataPromise}) => {
  const {pointsPrelevement} = await pointDataPromise

  if (pointsPrelevement.length === 0) {
    return null
  }

  return <PreleveurMap points={pointsPrelevement} />
}

const DeclarantSeries = async ({seriesPromise, seriesScope}) => {
  const seriesResult = await seriesPromise

  if (!seriesResult.success) {
    return <SeriesUnavailable />
  }

  return (
    <SeriesExplorer
      {...seriesScope}
      seriesOptions={seriesResult.data}
    />
  )
}

const DeclarantExploitations = async ({
  canCreate,
  declarantId,
  isCollecteur,
  pointDataPromise
}) => {
  const {exploitations} = await pointDataPromise

  if (isCollecteur) {
    return <CollecteurExploitationsList exploitations={exploitations} />
  }

  return (
    <ExploitationsList
      hidePreleveur
      exploitations={exploitations}
      createHref={canCreate ? getExploitationCreateHref(false, declarantId) : undefined}
    />
  )
}

const DeclarantDocuments = async ({
  canCreate,
  canDelete,
  canUpdate,
  declarantId,
  documentsPromise,
  pointDataPromise
}) => {
  const [documentsResult, pointData] = await Promise.all([
    documentsPromise,
    pointDataPromise
  ])

  return (
    <DocumentsList
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      idPreleveur={declarantId}
      documents={documentsResult.data || []}
      exploitations={pointData.exploitations}
    />
  )
}

const DeclarantRules = async ({
  canCreate,
  canDelete,
  canUpdate,
  hasExploitations,
  declarantId,
  reglesPromise
}) => {
  const reglesResult = await reglesPromise

  return (
    <ReglesListCard
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      hasExploitations={hasExploitations}
      preleveurId={declarantId}
      regles={reglesResult.data || []}
    />
  )
}

const Page = async ({params}) => {
  const {id} = await params

  const [declarantResult, currentUserResult] = await Promise.all([
    getDeclarantOverviewAction(id),
    getCurrentSessionInfo()
  ])

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const currentRole = currentUserResult?.data?.role
  const permissions = new Set(declarant.right?.permissions || [])
  const can = permission => currentRole === 'ADMIN'
    || (currentRole === 'INSTRUCTOR' && permissions.has(permission))
  const isDeclarantViewer = currentRole === 'DECLARANT'
  const declarantId = getDeclarantId(declarant)
  const declarantRole = getDeclarantRole(declarant)
  const isCollecteur = declarantRole === 'COLLECTEUR'
  const preleveurTypeLabel = getPreleveurTypeLabel(getPreleveurType(declarant))
  const exploitations = getDeclarantDetailExploitations(declarant)
  const pointIds = getExploitationPointIds(exploitations)
  const seriesScope = getDeclarantSeriesScope(declarant, declarantId, pointIds)
  const canReadDocuments = !isCollecteur && (isDeclarantViewer || can('declarant.document.read'))
  const canReadRules = !isCollecteur && (isDeclarantViewer || can('declarant.rule.read'))
  const canReadVolumes = isDeclarantViewer || can('declarant.volumes.read')
  const canReadPointDetails = isDeclarantViewer || can('pp.detail.read')
  const dataPromises = getDeclarantDataPromises({
    canReadDocuments,
    canReadRules,
    canReadVolumes,
    declarantId,
    seriesScope
  })
  const pointsByIdPromise = canReadPointDetails
    ? getPointsById(pointIds)
    : Promise.resolve(new Map())
  const pointDataPromise = getPointData(pointsByIdPromise, pointIds, exploitations)
  const title = getDeclarantTitleFromDeclarant(declarant)
  const hasInfoCard = hasDeclarantContactInfo(declarant)
  const mayHaveMap = canReadPointDetails && pointIds.length > 0
  const overviewClassName = getOverviewClassName(hasInfoCard, mayHaveMap)
  const exploitationsLabel = getExploitationsLabel(exploitations.length, isCollecteur)
  const canOpenManagement = [
    'declarant.invite',
    'declarant.delete',
    'declarant.zone.update',
    'declarant.declaration-type.read'
  ].some(permission => can(permission))
  const canReadExploitations = isDeclarantViewer || can('exploitation.list')
  const historyResult = can('declarant.update')
    ? await getResourceAuditHistoryAction('DECLARANT', declarantId)
    : {success: false}

  return (
    <Box className='fr-container min-h-full w-full flex flex-col gap-5 mb-5'>
      <EntityHeader
        title={
          <>
            <span className={getDeclarantTypeIcon(declarant)} />
            {' '}{title}
          </>
        }
        tags={[
          {
            label: getDeclarantRoleLabel(declarantRole),
            severity: isCollecteur ? 'info' : 'success'
          },
          !isCollecteur && {
            label: preleveurTypeLabel || 'Type non renseigné',
            severity: preleveurTypeLabel ? 'info' : 'warning'
          }
        ].filter(Boolean)}
        hrefButtons={[
          {
            label: 'Gérer le déclarant',
            icon: 'fr-icon-settings-5-line',
            alt: '',
            priority: 'secondary',
            href: `/declarants/${declarantId}/gestion`,
            hidden: !canOpenManagement,
            requireEditor: true
          },
          {
            label: 'Éditer le déclarant',
            icon: 'fr-icon-edit-line',
            alt: '',
            priority: 'secondary',
            href: `/declarants/${declarantId}/edit`,
            hidden: !can('declarant.update'),
            requireEditor: true
          }
        ]}
        metas={[
          {
            iconId: 'ri-map-pin-user-line',
            content: exploitationsLabel
          },
          !isDeclarationNotificationsEnabled(declarant) && {
            iconId: 'ri-notification-off-line',
            content: 'Rappels et relances désactivés'
          }
        ].filter(Boolean)}
      />

      {(hasInfoCard || mayHaveMap) && (
        <div className={overviewClassName}>
          {hasInfoCard && <InfoCard declarant={declarant} />}

          {mayHaveMap && (
            <Suspense fallback={<SectionLoading label='Chargement de la carte…' />}>
              <DeclarantMap pointDataPromise={pointDataPromise} />
            </Suspense>
          )}
        </div>
      )}

      {seriesScope && canReadVolumes && (
        <Suspense fallback={<SectionLoading label='Chargement des volumes…' />}>
          <DeclarantSeries
            seriesPromise={dataPromises.series}
            seriesScope={seriesScope}
          />
        </Suspense>
      )}

      {canReadExploitations && (
        <Suspense fallback={<SectionLoading label='Chargement des exploitations…' />}>
          <DeclarantExploitations
            canCreate={can('exploitation.create')}
            declarantId={declarantId}
            isCollecteur={isCollecteur}
            pointDataPromise={pointDataPromise}
          />
        </Suspense>
      )}

      {!isCollecteur && (canReadDocuments || canReadRules) && (
        <>
          {canReadDocuments && (
            <Suspense fallback={<SectionLoading label='Chargement des documents…' />}>
              <DeclarantDocuments
                canCreate={can('declarant.document.create')}
                canDelete={can('declarant.document.delete')}
                canUpdate={can('declarant.document.update')}
                declarantId={declarantId}
                documentsPromise={dataPromises.documents}
                pointDataPromise={pointDataPromise}
              />
            </Suspense>
          )}

          {canReadRules && (
            <Suspense fallback={<SectionLoading label='Chargement des règles…' />}>
              <DeclarantRules
                canCreate={can('declarant.rule.create')}
                canDelete={can('declarant.rule.delete')}
                canUpdate={can('declarant.rule.update')}
                hasExploitations={exploitations.length > 0}
                declarantId={declarantId}
                reglesPromise={dataPromises.regles}
              />
            </Suspense>
          )}
        </>
      )}

      {historyResult.success && (
        <ResourceMutationHistory
          initialData={historyResult.data?.data}
          resourceId={declarantId}
          resourceType='DECLARANT'
        />
      )}
    </Box>
  )
}

export default Page
