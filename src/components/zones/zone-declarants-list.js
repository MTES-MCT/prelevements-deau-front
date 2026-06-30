'use client'

import {useCallback} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert, Box} from '@mui/material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import ZoneExportButton from '@/components/zones/zone-export-button.js'
import {getZoneDeclarantExportColumns} from '@/components/zones/zone-export-columns.js'
import {withDeclarantsEmailAliases} from '@/components/zones/zone-export-email-aliases.js'
import {
  resolveAllZoneCollecteurs,
  resolveAllZoneDeclarants
} from '@/components/zones/zone-export-resolvers.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {
  ZonePagination,
  ZoneResourceToolbar,
  ZONE_COLLECTEUR_FILTERS,
  ZONE_DECLARANT_FILTERS
} from '@/components/zones/zone-list-tools.js'
import {
  getDeclarantRoleLabel,
  getDeclarantTitleFromUser,
  isDeclarantPhysique
} from '@/lib/declarants.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function getDeclarantIcon(declarant) {
  if (declarant.declarantRole === 'COLLECTEUR' || declarant.declarant?.declarantRole === 'COLLECTEUR') {
    return ZONE_ICONS.team
  }

  return isDeclarantPhysique(declarant)
    ? ZONE_ICONS.user
    : ZONE_ICONS.building
}

function getDeclarantId(declarant) {
  return declarant.id || declarant.userId || declarant.user?.id
}

function getDeclarantRole(declarant) {
  return declarant.declarantRole || declarant.declarant?.declarantRole || 'PRELEVEUR'
}

function getDistinctPreleveursFromCollecteur(declarant) {
  const byId = new Map()

  for (const link of declarant.collecteurExploitations ?? []) {
    if (link.preleveurUserId) {
      byId.set(link.preleveurUserId, link.preleveurLabel)
    }
  }

  return [...byId.values()].filter(Boolean)
}

function getDeclarantSubtitle(declarant) {
  const role = getDeclarantRole(declarant)

  if (role === 'COLLECTEUR') {
    const links = declarant.collecteurExploitations || []
    const preleveurs = getDistinctPreleveursFromCollecteur(declarant)
    const preleveurPreview = preleveurs.slice(0, 3).join(', ')
    const suffix = preleveurs.length > 3 ? `, +${preleveurs.length - 3}` : ''

    if (links.length === 0) {
      return 'Aucune exploitation accessible dans cette zone'
    }

    return `${pluralize(links.length, 'exploitation accessible', 'exploitations accessibles')} — ${preleveurPreview}${suffix}`
  }

  const points = declarant.points || []
  const count = points.length
  const names = points.slice(0, 3).map(point => point.name).join(', ')
  const suffix = points.length > 3 ? `, +${points.length - 3}` : ''

  if (count === 0) {
    return 'Aucun point dans cette zone'
  }

  return `${pluralize(count, 'point')} dans la zone — ${names}${suffix}`
}

function getDeclarantMetas(declarant) {
  const role = getDeclarantRole(declarant)

  if (role === 'COLLECTEUR') {
    const links = declarant.collecteurExploitations || []
    const preleveurs = getDistinctPreleveursFromCollecteur(declarant)

    return [
      {iconId: ZONE_ICONS.briefcase, content: pluralize(links.length, 'exploitation accessible', 'exploitations accessibles')},
      {iconId: ZONE_ICONS.user, content: pluralize(preleveurs.length, 'préleveur')},
      declarant.email && {iconId: ZONE_ICONS.at, content: declarant.email},
      declarant.phoneNumber && {iconId: ZONE_ICONS.phone, content: declarant.phoneNumber},
      declarant.city && {iconId: ZONE_ICONS.mapPin, content: declarant.city}
    ].filter(Boolean)
  }

  const pointsCount = declarant.points?.length || 0
  const collectorLinks = (declarant.points || []).flatMap(point => point.collecteurs || [])
  const collectorIds = new Set(collectorLinks.map(link => link.collecteurUserId || link.collecteur?.userId).filter(Boolean))

  return [
    {iconId: ZONE_ICONS.water, content: pluralize(pointsCount, 'point')},
    collectorIds.size > 0 && {iconId: ZONE_ICONS.team, content: pluralize(collectorIds.size, 'collecteur')},
    declarant.email && {iconId: ZONE_ICONS.at, content: declarant.email},
    !declarant.email && {iconId: ZONE_ICONS.at, content: 'Sans email'},
    declarant.phoneNumber && {iconId: ZONE_ICONS.phone, content: declarant.phoneNumber},
    declarant.city && {iconId: ZONE_ICONS.mapPin, content: declarant.city}
  ].filter(Boolean)
}

const ZoneDeclarantsList = ({zone, declarants, meta, collecteursOnly = false}) => {
  const itemLabel = collecteursOnly ? 'collecteur' : 'déclarant'
  const itemPlural = collecteursOnly ? 'collecteurs' : 'déclarants'
  const hasNoDeclarantInZone = (meta?.totalAll ?? declarants.length) === 0
  const hasNoResult = !hasNoDeclarantInZone && declarants.length === 0
  const emptyTitle = collecteursOnly
    ? 'Aucun collecteur n’est autorisé sur cette zone pour le moment.'
    : 'Aucun déclarant n’est rattaché à cette zone pour le moment.'

  const resolveExportRows = useCallback(async () => {
    const rows = collecteursOnly
      ? await resolveAllZoneCollecteurs(zone.id, meta)
      : await resolveAllZoneDeclarants(zone.id, meta)

    return withDeclarantsEmailAliases(rows)
  }, [collecteursOnly, meta, zone.id])

  if (hasNoDeclarantInZone) {
    return (
      <div className='flex flex-col gap-3'>
        <Alert severity='info'>{emptyTitle}</Alert>
        {zone.isAdmin && !collecteursOnly && (
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
        action={(
          <div className='flex flex-col md:items-end gap-2'>
            <div className='flex flex-wrap gap-2 justify-end'>
              <ZoneExportButton
                columns={getZoneDeclarantExportColumns({collecteursOnly})}
                filename={`${collecteursOnly ? 'collecteurs' : 'declarants'}-zone-${zone.code || zone.id}.xlsx`}
                resolveRows={resolveExportRows}
                rows={declarants}
                sheetName={collecteursOnly ? 'Collecteurs' : 'Déclarants'}
              />

              {zone.isAdmin && !collecteursOnly && (
                <Button iconId={ZONE_ICONS.addUser} linkProps={{href: `/declarants/new?zoneId=${zone.id}`}}>
                  Créer un déclarant
                </Button>
              )}
            </div>
          </div>
        )}
        filters={collecteursOnly ? ZONE_COLLECTEUR_FILTERS : ZONE_DECLARANT_FILTERS}
        itemLabel={itemLabel}
        itemPlural={itemPlural}
        meta={meta}
        searchLabel={`Rechercher un ${itemLabel}`}
        searchPlaceholder={collecteursOnly ? 'Nom, raison sociale, email, préleveur, point…' : 'Nom, raison sociale, email, ville, point…'}
      />

      {hasNoResult && (
        <Alert severity='info'>
          Aucun {itemLabel} ne correspond à cette recherche ou à ces filtres.
        </Alert>
      )}

      {declarants.map((declarant, index) => {
        const declarantId = getDeclarantId(declarant)
        const role = getDeclarantRole(declarant)

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
                    label: getDeclarantRoleLabel(role),
                    severity: role === 'COLLECTEUR' ? 'info' : 'success'
                  },
                  role === 'PRELEVEUR' && {
                    label: isDeclarantPhysique(declarant) ? 'Personne physique' : 'Personne morale',
                    severity: 'info'
                  },
                  !declarant.email && {
                    label: 'Sans email',
                    severity: 'warning'
                  }
                ].filter(Boolean)}
                metas={getDeclarantMetas(declarant)}
              />
            </Link>

            <div className='flex gap-2 md:items-center md:flex-col md:justify-center'>
              <Button priority='tertiary no outline' size='small' linkProps={{href: `/declarants/${declarantId}`}}>
                Ouvrir
              </Button>
              {zone.isAdmin && role === 'PRELEVEUR' && (
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
