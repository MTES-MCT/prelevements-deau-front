'use client'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const ZoneOverviewCards = ({zone}) => (
  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
    <SectionCard
      title='Déclarants'
      icon={ZONE_ICONS.user}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les déclarants',
        linkProps: {
          href: `/zones/${zone.id}/declarants`
        }
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.declarantsCount || 0, 'déclarant')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Déclarants ayant au moins un point de prélèvement rattaché à cette zone.
      </p>
    </SectionCard>

    <SectionCard
      title='Agents'
      icon={ZONE_ICONS.team}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les agents',
        linkProps: {
          href: `/zones/${zone.id}/agents`
        }
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.instructorsCount || 0, 'instructeur')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Agents autorisés à consulter ou administrer cette zone.
      </p>
    </SectionCard>

    {zone.isAdmin && (
      <SectionCard
        title='Administration'
        icon={ZONE_ICONS.shieldCheck}
        editorOnly={false}
        buttonProps={{
          priority: 'primary',
          iconId: ZONE_ICONS.addUser,
          children: 'Ajouter un agent',
          linkProps: {
            href: `/zones/${zone.id}/agents/ajouter`
          }
        }}
      >
        <p className='fr-text--sm fr-mb-0'>
          En tant qu’admin de cette zone, vous pouvez ajouter ou retirer des agents.
          La suppression retire uniquement le rattachement à la zone, pas le compte utilisateur.
        </p>
      </SectionCard>
    )}
  </div>
)

export default ZoneOverviewCards
