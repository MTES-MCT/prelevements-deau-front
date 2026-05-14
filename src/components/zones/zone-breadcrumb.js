'use client'

import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'

const ZoneBreadcrumb = ({zone, currentPageLabel, segments = []}) => {
  const computedSegments = []

  if (zone || segments.length > 0) {
    computedSegments.push({
      label: 'Mes zones',
      linkProps: {
        href: '/zones'
      }
    })
  }

  if (zone && currentPageLabel !== zone.name) {
    computedSegments.push({
      label: zone.name,
      linkProps: {
        href: `/zones/${zone.id}`
      }
    })
  }

  computedSegments.push(...segments)

  return (
    <Breadcrumb
      currentPageLabel={currentPageLabel}
      homeLinkProps={{
        href: '/'
      }}
      segments={computedSegments}
    />
  )
}

export default ZoneBreadcrumb
