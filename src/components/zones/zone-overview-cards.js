'use client'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const ZoneOverviewCards = ({zone}) => (
  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
    <SectionCard
      title='Points de prélèvement'
      icon={ZONE_ICONS.water}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les points',
        linkProps: {href: `/zones/${zone.id}/points-prelevement`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.pointsCount || 0, 'point de prélèvement', 'points de prélèvement')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Points localisés dans cette zone. Les admins de zone peuvent les créer et les maintenir directement ici.
      </p>
    </SectionCard>

    <SectionCard
      title='Préleveurs'
      icon={ZONE_ICONS.user}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les déclarants',
        linkProps: {href: `/zones/${zone.id}/declarants`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.preleveursCount ?? zone.declarantsCount ?? 0, 'préleveur')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Préleveurs ayant au moins une exploitation sur un point de cette zone.
      </p>
    </SectionCard>

    <SectionCard
      title='Collecteurs'
      icon={ZONE_ICONS.team}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les collecteurs',
        linkProps: {href: `/zones/${zone.id}/collecteurs`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.collecteursCount || 0, 'collecteur')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Collecteurs autorisés à déposer des déclarations pour des exploitations de cette zone.
      </p>
    </SectionCard>

    <SectionCard
      title='Exploitations'
      icon={ZONE_ICONS.briefcase}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir les exploitations',
        linkProps: {href: `/zones/${zone.id}/exploitations`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.exploitationsCount || 0, 'exploitation')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Rattachements préleveur ↔ point de prélèvement. Les collecteurs sont gérés comme droits sur ces exploitations.
      </p>
    </SectionCard>

    <SectionCard
      title='Suivi mensuel des déclarations'
      icon={ZONE_ICONS.table}
      editorOnly={false}
      buttonProps={{
        priority: 'secondary',
        iconId: ZONE_ICONS.arrowRight,
        children: 'Voir la matrice',
        linkProps: {href: `/zones/${zone.id}/suivi-declarations`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        Vue synthétique
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Une matrice compacte affiche mois par mois les déclarations déposées pour chaque exploitation de la zone.
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
        linkProps: {href: `/zones/${zone.id}/agents`}
      }}
    >
      <p className='fr-text--lead fr-mb-1w'>
        {pluralize(zone.instructorsCount || 0, 'agent')}
      </p>
      <p className='fr-text--sm fr-mb-0'>
        Agents autorisés à consulter ou administrer cette zone.
      </p>
    </SectionCard>

    {zone.isAdmin && (
      <SectionCard
        title='Actions rapides'
        icon={ZONE_ICONS.shieldCheck}
        editorOnly={false}
        buttonProps={{
          priority: 'primary',
          iconId: ZONE_ICONS.add,
          children: 'Créer une exploitation',
          linkProps: {href: `/zones/${zone.id}/exploitations/nouvelle`}
        }}
      >
        <p className='fr-text--sm fr-mb-0'>
          Créez ou mettez à jour les exploitations, puis associez les collecteurs aux exploitations concernées.
        </p>
      </SectionCard>
    )}
  </div>
)

export default ZoneOverviewCards
