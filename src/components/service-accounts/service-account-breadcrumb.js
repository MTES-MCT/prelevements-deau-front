'use client'

import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'

const ServiceAccountBreadcrumb = ({serviceAccount, currentPageLabel, segments = []}) => {
  const computedSegments = [
    {
      label: 'Comptes de service',
      linkProps: {
        href: '/comptes-service'
      }
    }
  ]

  if (serviceAccount && currentPageLabel !== serviceAccount.name) {
    computedSegments.push({
      label: serviceAccount.name,
      linkProps: {
        href: `/comptes-service/${serviceAccount.id}`
      }
    })
  }

  computedSegments.push(...segments)

  return (
    <Breadcrumb
      currentPageLabel={currentPageLabel}
      homeLinkProps={{href: '/'}}
      segments={computedSegments}
    />
  )
}

export default ServiceAccountBreadcrumb
