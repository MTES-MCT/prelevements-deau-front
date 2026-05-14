'use client'

import {Alert} from '@mui/material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'

const ZONE_TYPE_LABELS = {
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'SAGE'
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const ZonesList = ({zones}) => {
  if (zones.length === 0) {
    return (
      <Alert severity='info'>
        Aucune zone active n’est rattachée à votre compte instructeur.
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {zones.map((zone, index) => (
        <Link key={zone.id} href={`/zones/${zone.id}`}>
          <ListItem
            border
            background={index % 2 === 0 ? 'primary' : 'secondary'}
            title={(
              <>
                <span className={`${ZONE_ICONS.mapPin2} mr-2`} />
                {zone.name}
              </>
            )}
            subtitle={`${ZONE_TYPE_LABELS[zone.type] || zone.type} — ${zone.code}`}
            tags={[
              zone.isAdmin
                ? {
                  label: 'Admin de zone',
                  severity: 'success'
                }
                : {
                  label: 'Consultation',
                  severity: 'info'
                }
            ]}
            metas={[
              {
                iconId: ZONE_ICONS.user,
                content: pluralize(zone.declarantsCount || 0, 'déclarant')
              },
              {
                iconId: ZONE_ICONS.team,
                content: pluralize(zone.instructorsCount || 0, 'agent')
              }
            ]}
          />
        </Link>
      ))}
    </div>
  )
}

export default ZonesList
