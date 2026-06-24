import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import PreleveurMap from '@/components/declarants/preleveur-map.js'
import DocumentsList from '@/components/documents/documents-list.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import ReglesListCard from '@/components/regles/regles-list-card.js'
import EntityHeader from '@/components/ui/EntityHeader/index.js'
import Icon from '@/components/ui/Icon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {getDeclarantTitleFromDeclarant, getDeclarantTypeIcon} from '@/lib/declarants.js'
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

const InfoCard = ({declarant}) => {
  if (!declarant.email && !declarant.phoneNumber && !declarant.addressLine1) {
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
  const exploitations = declarant.pointPrelevements || []

  const [documentsResult, reglesResult, seriesResult] = await Promise.all([
    getDocumentsFromPreleveurAction(declarantId),
    getReglesFromPreleveurAction(declarantId),
    getAggregatedSeriesOptionsAction({preleveurId: declarantId})
  ])

  const documents = documentsResult.data || []
  const regles = reglesResult.data || []
  const seriesOptions = seriesResult.data

  const pointIds = [
    ...new Set(
      exploitations
        .map(exploitation => exploitation.pointPrelevement?.id)
        .filter(Boolean)
    )
  ]

  let pointsById = new Map()

  if (pointIds.length > 0) {
    const pointResults = await getPointsPrelevementBatchAction(pointIds)

    if (pointResults.success && Array.isArray(pointResults.data)) {
      pointsById = new Map(pointResults.data.map(point => [point.id, point]))
    }
  }

  const exploitationsWithPoints = exploitations.map(exploitation => {
    const pointId = exploitation.pointPrelevement?.id

    return {
      ...exploitation,
      pointPrelevement: pointId
        ? (pointsById.get(pointId) ?? exploitation.pointPrelevement)
        : exploitation.pointPrelevement
    }
  })

  const pointsPrelevement = [...pointsById.values()]
  const title = getDeclarantTitleFromDeclarant(declarant)

  return (
    <Box className='fr-container h-full w-full flex flex-col gap-5 mb-5'>
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
            content: <>{exploitations.length} exploitation{exploitations.length > 1 ? 's' : ''}</>
          }
        ]}
      />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start'>
        <InfoCard declarant={declarant} />

        {pointsPrelevement.length > 0 && (
          <PreleveurMap points={pointsPrelevement} />
        )}
      </div>

      <SeriesExplorer
        preleveurId={declarantId}
        seriesOptions={seriesOptions}
      />

      <ExploitationsList
        hidePreleveur
        exploitations={exploitationsWithPoints}
        preleveurs={[declarant]}
        createHref={getNewExploitationURL({idPreleveur: declarantId})}
      />

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
    </Box>
  )
}

export default Page
