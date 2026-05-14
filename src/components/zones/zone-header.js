'use client'

import EntityHeader from '@/components/ui/EntityHeader/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'

const ZONE_TYPE_LABELS = {
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'SAGE'
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const ZoneHeader = ({zone, currentSection = 'overview'}) => (
  <EntityHeader
    title={(
      <>
        <span className={ZONE_ICONS.mapPin2} />
        {' '}
        {zone.name}
      </>
    )}
    tags={[
      {
        label: ZONE_TYPE_LABELS[zone.type] || zone.type,
        severity: 'info'
      }
    ]}
    rightBadges={[
      zone.isAdmin
        ? {
          label: 'Admin de zone',
          iconId: ZONE_ICONS.shieldCheck
        }
        : {
          label: 'Consultation',
          iconId: ZONE_ICONS.eye
        }
    ]}
    metas={[
      {
        iconId: ZONE_ICONS.hashtag,
        content: zone.code
      },
      {
        iconId: ZONE_ICONS.user,
        content: pluralize(zone.declarantsCount || 0, 'déclarant')
      },
      {
        iconId: ZONE_ICONS.team,
        content: pluralize(zone.instructorsCount || 0, 'agent')
      }
    ]}
    hrefButtons={[
      {
        label: 'Ajouter un agent',
        icon: ZONE_ICONS.addUser,
        alt: '',
        priority: 'primary',
        href: `/zones/${zone.id}/agents/ajouter`,
        hidden: !zone.isAdmin || currentSection === 'add-agent'
      }
    ]}
  />
)

export default ZoneHeader
