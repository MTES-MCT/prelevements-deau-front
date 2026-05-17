'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert, Box} from '@mui/material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {
  ZonePagination,
  ZoneResourceToolbar
} from '@/components/zones/zone-list-tools.js'
import {
  getDeclarantTitleFromUser,
  isDeclarantPhysique
} from '@/lib/declarants.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function getDeclarantIcon(declarant) {
  return isDeclarantPhysique(declarant)
    ? ZONE_ICONS.user
    : ZONE_ICONS.building
}

function getDeclarantSubtitle(declarant) {
  const points = declarant.points || []
  const count = points.length
  const names = points.slice(0, 3).map(point => point.name).join(', ')
  const suffix = points.length > 3 ? `, +${points.length - 3}` : ''

  if (count === 0) {
    return 'Aucun point dans cette zone'
  }

  return `${pluralize(count, 'point')} dans la zone — ${names}${suffix}`
}

function getDeclarantId(declarant) {
  return declarant.id || declarant.userId || declarant.user?.id
}

const ZoneDeclarantsList = ({zone, declarants, meta}) => {
  const hasNoDeclarantInZone = (meta?.totalAll ?? declarants.length) === 0
  const hasNoResult = !hasNoDeclarantInZone && declarants.length === 0

  if (hasNoDeclarantInZone) {
    return (
      <div className='flex flex-col gap-3'>
        <Alert severity='info'>
          Aucun déclarant n’est rattaché à cette zone pour le moment.
        </Alert>
        {zone.isAdmin && (
          <div className='flex flex-col md:flex-row gap-3 md:items-center md:justify-between'>
            <p className='fr-text--sm fr-mb-0'>
              Créer un déclarant ne le rattache pas automatiquement à la zone. Pour le rattacher, créez ensuite une exploitation sur un point de cette zone.
            </p>
            <Button iconId={ZONE_ICONS.addUser} linkProps={{href: `/declarants/new?zoneId=${zone.id}`}}>
              Créer un déclarant
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <ZoneResourceToolbar
        action={zone.isAdmin && (
          <div className='flex flex-col md:items-end gap-2'>
            <Button iconId={ZONE_ICONS.addUser} linkProps={{href: `/declarants/new?zoneId=${zone.id}`}}>
              Créer un déclarant
            </Button>
            <p className='fr-text--xs fr-mb-0 max-w-sm md:text-right'>
              Le déclarant sera global. Il apparaîtra dans cette zone après création d’une exploitation sur un point de la zone.
            </p>
          </div>
        )}
        itemLabel='déclarant'
        itemPlural='déclarants'
        meta={meta}
        searchLabel='Rechercher un déclarant'
        searchPlaceholder='Nom, raison sociale, email, ville, point…'
      />

      {hasNoResult && (
        <Alert severity='info'>
          Aucun déclarant ne correspond à cette recherche.
        </Alert>
      )}

      {declarants.map((declarant, index) => {
        const declarantId = getDeclarantId(declarant)
        const pointsCount = declarant.points?.length || 0

        return (
          <Box key={declarantId} className='flex flex-col md:flex-row gap-2 md:items-stretch'>
            <Link className='flex-1' href={`/declarants/${declarantId}`}>
              <ListItem
                border
                background={index % 2 === 0 ? 'primary' : 'secondary'}
                title={(
                  <>
                    <span className={`${getDeclarantIcon(declarant)} mr-2`} />
                    {getDeclarantTitleFromUser(declarant)}
                  </>
                )}
                subtitle={getDeclarantSubtitle(declarant)}
                tags={[
                  {
                    label: isDeclarantPhysique(declarant) ? 'Personne physique' : 'Personne morale',
                    severity: 'info'
                  }
                ]}
                metas={[
                  {iconId: ZONE_ICONS.water, content: pluralize(pointsCount, 'point')},
                  declarant.email && {
                    iconId: ZONE_ICONS.at,
                    content: declarant.email
                  },
                  declarant.phoneNumber && {
                    iconId: ZONE_ICONS.phone,
                    content: declarant.phoneNumber
                  },
                  declarant.city && {
                    iconId: ZONE_ICONS.mapPin,
                    content: declarant.city
                  }
                ].filter(Boolean)}
              />
            </Link>

            <div className='flex gap-2 md:items-center md:flex-col md:justify-center'>
              <Button priority='tertiary no outline' size='small' linkProps={{href: `/declarants/${declarantId}`}}>
                Ouvrir
              </Button>
              {zone.isAdmin && (
                <Button
                  priority='tertiary no outline'
                  size='small'
                  linkProps={{href: `/zones/${zone.id}/exploitations/nouvelle?declarantId=${declarantId}`}}
                >
                  Créer une exploitation
                </Button>
              )}
            </div>
          </Box>
        )
      })}

      <ZonePagination meta={meta} />
    </div>
  )
}

export default ZoneDeclarantsList
