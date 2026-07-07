import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
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
  getDeclarantTitleFromDeclarant,
  getDeclarantTypeIcon,
  isDeclarationNotificationsEnabled
} from '@/lib/declarants.js'
import {formatFullAddress} from '@/lib/declaration.js'
import {getNewExploitationURL} from '@/lib/urls.js'
import {
  getDeclarantAction,
  getDocumentsFromPreleveurAction,
  getReglesFromPreleveurAction
} from '@/server/actions/index.js'
import {getPointsPrelevementBatchAction} from '@/server/actions/points-prelevement.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'

const iconColorStyle = {color: fr.colors.decisions.text.label.blueFrance.default}

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantAction(id)

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

function getDeclarantDataPromises({isCollecteur, declarantId, seriesScope}) {
  return Promise.all([
    isCollecteur ? Promise.resolve({data: []}) : getDocumentsFromPreleveurAction(declarantId),
    isCollecteur ? Promise.resolve({data: []}) : getReglesFromPreleveurAction(declarantId),
    seriesScope ? getAggregatedSeriesOptionsAction(seriesScope) : Promise.resolve({data: null})
  ])
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

const Page = async ({params}) => {
  const {id} = await params

  const declarantResult = await getDeclarantAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const declarantId = getDeclarantId(declarant)
  const isCollecteur = getDeclarantRole(declarant) === 'COLLECTEUR'
  const exploitations = getDeclarantDetailExploitations(declarant)
  const pointIds = getExploitationPointIds(exploitations)
  const seriesScope = getDeclarantSeriesScope(declarant, declarantId, pointIds)

  const [documentsResult, reglesResult, seriesResult] = await getDeclarantDataPromises({
    isCollecteur,
    declarantId,
    seriesScope
  })

  const documents = documentsResult.data || []
  const regles = reglesResult.data || []
  const seriesOptions = seriesResult.data
  const pointsById = await getPointsById(pointIds)
  const exploitationsWithPoints = enrichExploitationsWithPoints(exploitations, pointsById)
  const pointsPrelevement = getPointsPrelevement(pointIds, pointsById, exploitations)
  const title = getDeclarantTitleFromDeclarant(declarant)
  const hasInfoCard = hasDeclarantContactInfo(declarant)
  const hasMap = pointsPrelevement.length > 0
  const overviewClassName = getOverviewClassName(hasInfoCard, hasMap)
  const exploitationsLabel = getExploitationsLabel(exploitations.length, isCollecteur)

  return (
    <Box className='fr-container min-h-full w-full flex flex-col gap-5 mb-5'>
      <EntityHeader
        title={
          <>
            <span className={getDeclarantTypeIcon(declarant)} />
            {' '}{title}
          </>
        }
        hrefButtons={[
          {
            label: 'Gérer le déclarant',
            icon: 'fr-icon-settings-5-line',
            alt: '',
            priority: 'secondary',
            href: `/declarants/${declarantId}/gestion`,
            requireEditor: true
          },
          {
            label: 'Éditer le déclarant',
            icon: 'fr-icon-edit-line',
            alt: '',
            priority: 'secondary',
            href: `/declarants/${declarantId}/edit`,
            hidden: !declarant.right?.canEdit,
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

      {(hasInfoCard || hasMap) && (
        <div className={overviewClassName}>
          {hasInfoCard && <InfoCard declarant={declarant} />}

          {hasMap && (
            <PreleveurMap points={pointsPrelevement} />
          )}
        </div>
      )}

      {seriesScope && (
        <SeriesExplorer
          {...seriesScope}
          seriesOptions={seriesOptions}
        />
      )}

      {isCollecteur ? (
        <CollecteurExploitationsList exploitations={exploitationsWithPoints} />
      ) : (
        <ExploitationsList
          hidePreleveur
          exploitations={exploitationsWithPoints}
          createHref={getExploitationCreateHref(isCollecteur, declarantId)}
        />
      )}

      {!isCollecteur && (
        <>
          <DocumentsList
            idPreleveur={declarantId}
            documents={documents}
            exploitations={exploitationsWithPoints}
          />

          <ReglesListCard
            hasExploitations={exploitations.length > 0}
            preleveurId={declarantId}
            regles={regles}
          />
        </>
      )}
    </Box>
  )
}

export default Page
