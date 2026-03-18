import {fr} from '@codegouvfr/react-dsfr'
import {
  Box
} from '@mui/material'
import {notFound} from 'next/navigation'

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
import {getDeclarantAction} from '@/server/actions/declarants.js'
import {getPointPrelevementAction} from '@/server/actions/points-prelevement.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'

const iconColorStyle = {color: fr.colors.decisions.text.label.blueFrance.default}

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
  const exploitations = declarant.pointPrelevements

  const documentsResult = (async () => ({data: []})) // @TODO: getDocumentsFromPreleveurAction(id)
  const reglesResult = (async () => ({data: []})) // @TODO: getReglesFromPreleveurAction(declarant.userId)
  const seriesResult = await getAggregatedSeriesOptionsAction({preleveurId: id})

  const documents = documentsResult.data || []
  const regles = reglesResult.data || []
  const seriesOptions = seriesResult.data

  const pointsPrelevement = []

  const exploitationsWithPoints = await Promise.all(exploitations.map(async exploitation => {
    const pointResult = await getPointPrelevementAction(exploitation.pointPrelevement.id)

    // Only push point if the request was successful
    if (pointResult.success && pointResult.data) {
      pointsPrelevement.push(pointResult.data)
    }

    return {...exploitation, point: pointResult.success ? pointResult.data : null}
  }))

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
            label: 'Éditer le declarant',
            icon: 'fr-icon-edit-line',
            alt: '',
            priority: 'secondary',
            href: `/preleveurs/${declarant.userId}/edit`,
            requireEditor: true
          }
        ]}
        metas={[
          {
            iconId: 'ri-map-pin-user-line',
            content: <>{declarant.pointPrelevements.length} exploitation{declarant.pointPrelevements.length > 0 ? 's' : ''}</>
          }
        ]}
      />
      <InfoCard declarant={declarant} />
      {pointsPrelevement.length > 0 && (
        <PreleveurMap points={pointsPrelevement} />
      )}
      <SeriesExplorer
        preleveurId={declarant.userId}
        seriesOptions={seriesOptions}
      />
      <ExploitationsList
        hidePreleveur
        exploitations={exploitationsWithPoints}
        preleveurs={[declarant]}
        createHref={getNewExploitationURL({idPreleveur: declarant.userId})}
      />
      <DocumentsList
        idPreleveur={id}
        documents={documents}
        exploitations={exploitationsWithPoints}
      />
      <ReglesListCard
        hasExploitations={exploitations.length > 0}
        preleveurId={id}
        regles={regles}
      />
    </Box>
  )
}

export default Page
