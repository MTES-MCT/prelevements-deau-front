'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert, Box} from '@mui/material'
import Link from 'next/link'
import {useRouter} from 'next/navigation'

import ListItem from '@/components/ui/ListItem/index.js'
import ZoneExportButton from '@/components/zones/zone-export-button.js'
import {ZONE_POINTS_EXPORT_COLUMNS} from '@/components/zones/zone-export-columns.js'
import {resolveAllZonePoints} from '@/components/zones/zone-export-resolvers.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {
  ZonePagination,
  ZoneResourceToolbar
} from '@/components/zones/zone-list-tools.js'
import {deleteZonePointPrelevementAction} from '@/server/actions/zones.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function getPointDeclarants(point) {
  return point.preleveurs || point.declarants || []
}

const ZonePointsList = ({zone, points, meta}) => {
  const router = useRouter()
  const [error, setError] = useState(null)
  const [deletingPointId, setDeletingPointId] = useState(null)
  const hasNoPointInZone = (meta?.totalAll ?? points.length) === 0
  const hasNoResult = !hasNoPointInZone && points.length === 0

  async function handleDelete(point) {
    setError(null)

    // eslint-disable-next-line no-alert
    const confirmed = globalThis.confirm(
      `Supprimer le point de prélèvement « ${point.name || point.id} » ?\n\nCette action est irréversible et impossible si le point possède des exploitations actives.`
    )

    if (!confirmed) {
      return
    }

    setDeletingPointId(point.id)

    try {
      const response = await deleteZonePointPrelevementAction(zone.id, point.id)

      if (!response.success) {
        setError(response.error || 'La suppression du point de prélèvement a échoué.')
        return
      }

      router.refresh()
    } finally {
      setDeletingPointId(null)
    }
  }

  if (hasNoPointInZone) {
    return (
      <div className='flex flex-col gap-3'>
        <Alert severity='info'>Aucun point de prélèvement n’est encore rattaché à cette zone.</Alert>
        {zone.isAdmin && (
          <div>
            <Button iconId={ZONE_ICONS.add} linkProps={{href: `/zones/${zone.id}/points-prelevement/nouveau`}}>
              Créer le premier point
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {error && <Alert severity='error'>{error}</Alert>}

      <ZoneResourceToolbar
        action={(
          <div className='flex flex-wrap gap-2 justify-end'>
            <ZoneExportButton
              columns={ZONE_POINTS_EXPORT_COLUMNS}
              filename={`points-prelevement-zone-${zone.code || zone.id}.xlsx`}
              resolveRows={() => resolveAllZonePoints(zone.id, meta)}
              rows={points}
              sheetName='Points'
            />

            {zone.isAdmin && (
              <Button iconId={ZONE_ICONS.add} linkProps={{href: `/zones/${zone.id}/points-prelevement/nouveau`}}>
                Créer un point
              </Button>
            )}
          </div>
        )}
        itemLabel='point'
        itemPlural='points'
        meta={meta}
        searchLabel='Rechercher un point de prélèvement'
        searchPlaceholder='Nom, commune, code BSS, code BNPE, déclarant…'
      />

      {hasNoResult && <Alert severity='info'>Aucun point ne correspond à cette recherche.</Alert>}

      {points.map((point, index) => {
        const declarants = getPointDeclarants(point)
        const canEdit = Boolean(point.right?.canEdit)

        return (
          <Box key={point.id} className='flex flex-col md:flex-row gap-2 md:items-stretch'>
            <Link className='flex-1' href={`/points-prelevement/${point.id}`}>
              <ListItem
                border
                background={index % 2 === 0 ? 'primary' : 'secondary'}
                title={<><span className={`${ZONE_ICONS.water} mr-2`} />{point.name || 'Point sans nom'}</>}
                subtitle={point.communeName || point.codeBSS || point.id}
                tags={[
                  {label: point.waterBodyType || 'Milieu non renseigné', severity: 'info', hasIcon: false},
                  canEdit ? {label: 'Modifiable dans cette zone', severity: 'success'} : {label: 'Lecture seule', severity: 'info'}
                ]}
                metas={[
                  {iconId: ZONE_ICONS.user, content: pluralize(declarants.length, 'déclarant')},
                  point.usages?.length > 0 && {iconId: ZONE_ICONS.briefcase, content: `${point.usages.length} usage${point.usages.length > 1 ? 's' : ''}`},
                  point.codeBSS && {iconId: ZONE_ICONS.hashtag, content: `BSS ${point.codeBSS}`},
                  point.codeBNPE && {iconId: ZONE_ICONS.hashtag, content: `BNPE ${point.codeBNPE}`}
                ].filter(Boolean)}
              />
            </Link>

            <div className='flex gap-2 md:items-center md:flex-col md:justify-center'>
              <Button priority='tertiary no outline' size='small' linkProps={{href: `/points-prelevement/${point.id}`}}>Ouvrir</Button>
              {canEdit && (
                <Button priority='tertiary no outline' size='small' linkProps={{href: `/zones/${zone.id}/points-prelevement/${point.id}/modifier`}}>
                  Éditer
                </Button>
              )}
              {canEdit && (
                <Button
                  priority='tertiary no outline'
                  size='small'
                  linkProps={{href: `/zones/${zone.id}/exploitations/nouvelle?pointId=${point.id}`}}
                >
                  Créer une exploitation
                </Button>
              )}
              {canEdit && (
                <Button
                  disabled={deletingPointId === point.id}
                  priority='tertiary no outline'
                  size='small'
                  onClick={() => handleDelete(point)}
                >
                  Supprimer
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

export default ZonePointsList
