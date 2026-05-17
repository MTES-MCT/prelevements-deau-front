'use client'

import {formatDate, pluralize} from '@/components/service-accounts/service-account-utils.js'
import EntityHeader from '@/components/ui/EntityHeader/index.js'

function getRightBadge(serviceAccount) {
  if (serviceAccount.isDeleted) {
    return {
      label: 'Supprimé',
      iconId: 'fr-icon-delete-line'
    }
  }

  if (!serviceAccount.isActive) {
    return {
      label: 'Désactivé',
      iconId: 'fr-icon-error-warning-line'
    }
  }

  return {
    label: 'Actif',
    iconId: 'fr-icon-success-line'
  }
}

const ServiceAccountHeader = ({serviceAccount, currentSection = 'overview'}) => (
  <EntityHeader
    title={(
      <>
        <span className='fr-icon-lock-line' aria-hidden='true' />
        {' '}
        {serviceAccount.name}
      </>
    )}
    tags={[
      {
        label: 'Compte de service',
        severity: 'info'
      }
    ]}
    rightBadges={[getRightBadge(serviceAccount)]}
    hrefButtons={[
      {
        label: 'Rattacher un déclarant',
        icon: 'fr-icon-add-line',
        alt: '',
        priority: 'primary',
        href: `/comptes-service/${serviceAccount.id}/declarants`,
        hidden: serviceAccount.isDeleted || currentSection === 'declarants'
      },
      {
        label: 'Créer un identifiant',
        icon: 'fr-icon-add-line',
        alt: '',
        priority: 'secondary',
        href: `/comptes-service/${serviceAccount.id}/identifiants`,
        hidden: serviceAccount.isDeleted || currentSection === 'credentials'
      }
    ]}
    metas={[
      {
        iconId: 'fr-icon-information-line',
        content: serviceAccount.id
      },
      {
        iconId: 'fr-icon-user-line',
        content: pluralize(serviceAccount.counts?.activeDeclarants || 0, 'déclarant actif')
      },
      {
        iconId: 'fr-icon-lock-line',
        content: pluralize(serviceAccount.counts?.usableCredentials || 0, 'identifiant actif')
      },
      {
        iconId: 'fr-icon-calendar-line',
        content: `Créé le ${formatDate(serviceAccount.createdAt)}`
      }
    ]}
  />
)

export default ServiceAccountHeader
