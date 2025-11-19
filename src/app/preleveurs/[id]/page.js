import {fr} from '@codegouvfr/react-dsfr'
import {
  Box
} from '@mui/material'
import {notFound} from 'next/navigation'

import {
  getPreleveur,
  getExploitationFromPreleveur,
  getDocumentsFromPreleveur,
  getPointPrelevement
} from '@/app/api/points-prelevement.js'
import {getAggregatedSeriesOptions} from '@/app/api/series.js'
import DocumentsList from '@/components/documents/documents-list.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import PreleveurMap from '@/components/preleveurs/preleveur-map.js'
import EntityHeader from '@/components/ui/EntityHeader/index.js'
import Icon from '@/components/ui/Icon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {usageIcons} from '@/lib/points-prelevement.js'

const iconColorStyle = {color: fr.colors.decisions.text.label.blueFrance.default}

function formatAdresse(preleveur) {
  if (!preleveur.adresse_1 && !preleveur.adresse_2 && !preleveur.bp && !preleveur.code_postal && !preleveur.commune) {
    return null
  }

  return `${preleveur.adresse_1 || ''}${preleveur.adresse_2 ? ', ' + preleveur.adresse_2 : ''} - ${preleveur.bp || ''}${preleveur.code_postal ? ', ' + preleveur.code_postal : ''}${preleveur.commune ? ' ' + preleveur.commune : ''}`
}

const InfoCard = ({preleveur}) => {
  if (!preleveur.email && !preleveur.numero_telephone && !preleveur.adresse_1) {
    return null
  }

  return (
    <SectionCard>
      <ul className='[&>li]:flex [&>li]:gap-1'>
        <li>
          <Icon iconId='ri-user-line' style={iconColorStyle} />
          <span>
            {preleveur.civilite && preleveur.nom && preleveur.prenom
              ? `${preleveur.civilite} ${preleveur.nom} ${preleveur.prenom}`
              : 'Non renseigné'}
          </span>
        </li>
        <li>
          <Icon iconId='ri-at-line' style={iconColorStyle} />
          <span>{preleveur.email || 'Non renseigné'}</span>
        </li>
        <li>
          <Icon iconId='ri-phone-line' style={iconColorStyle} />
          <span>{preleveur.numero_telephone || 'Non renseigné'}</span>
        </li>
        <li>
          <Icon iconId='ri-home-4-line' style={iconColorStyle} />
          <span>
            {formatAdresse(preleveur) || 'Non renseignée'}
          </span>
        </li>
      </ul>
    </SectionCard>
  )
}

const Page = async ({params}) => {
  const {id} = await params

  const preleveur = await getPreleveur(id)

  if (!preleveur) {
    notFound()
  }

  const documents = await getDocumentsFromPreleveur(id)
  const exploitations = await getExploitationFromPreleveur(id)
  const seriesOptions = await getAggregatedSeriesOptions({preleveurId: id})

  const pointsPrelevement = []

  const exploitationsWithPoints = await Promise.all(exploitations.map(async exploitation => {
    const point = await getPointPrelevement(exploitation.point)
    pointsPrelevement.push(point)

    return {...exploitation, point}
  }))

  const title = preleveur.raison_sociale
    ? `${preleveur.sigle ? preleveur.sigle + ' ' : ''}${preleveur.raison_sociale}`
    : (preleveur.civilite && preleveur.nom && preleveur.prenom
      ? `${preleveur.civilite} ${preleveur.nom} ${preleveur.prenom}`
      : 'Non renseigné')

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-5'>
        <EntityHeader
          title={
            <>
              <span className='fr-icon-user-line' />
              {' '}{title}
            </>
          }
          rightBadges={preleveur.usages.map(usage => (
            {label: usage, icon: usageIcons[usage]}
          ))}
          hrefButtons={[
            {
              label: 'Éditer le préleveur',
              icon: 'fr-icon-edit-line',
              alt: '',
              priority: 'secondary',
              href: `/preleveurs/${preleveur.id_preleveur}/edit`
            }
          ]}
          metas={[
            {
              iconId: 'ri-map-pin-user-line',
              content: <>{preleveur.exploitations.length} exploitation{preleveur.exploitations.length > 0 ? 's' : ''}</>
            }
          ]}
        />
        <InfoCard preleveur={preleveur} />
        {pointsPrelevement.length > 0 && (
          <PreleveurMap points={pointsPrelevement} />
        )}
        <SeriesExplorer preleveurId={preleveur.id_preleveur} seriesOptions={seriesOptions} />
        <ExploitationsList hidePreleveur exploitations={exploitationsWithPoints} preleveurs={[preleveur]} />
        <DocumentsList idPreleveur={id} documents={documents} />
      </Box>
    </>
  )
}

export default Page
