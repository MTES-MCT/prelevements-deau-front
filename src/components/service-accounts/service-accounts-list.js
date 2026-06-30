import Link from 'next/link'

import ServiceAccountStatusBadge from '@/components/service-accounts/service-account-status-badge.js'
import {formatDate, pluralize} from '@/components/service-accounts/service-account-utils.js'

function sortServiceAccounts(serviceAccounts) {
  return [...serviceAccounts].sort((a, b) => {
    if (a.isDeleted !== b.isDeleted) {
      return a.isDeleted ? 1 : -1
    }

    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1
    }

    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

const EmptyState = () => (
  <div className='fr-callout fr-callout--blue-france fr-mt-3w'>
    <h2 className='fr-callout__title'>Aucun compte de service</h2>
    <p className='fr-callout__text'>Créez un premier compte pour préparer les accès techniques de la brique d’intégration.</p>
    <Link className='fr-btn fr-btn--icon-left fr-icon-add-line' href='/comptes-service/nouveau'>
      Créer un compte de service
    </Link>
  </div>
)

const ServiceAccountsList = ({serviceAccounts = []}) => {
  const sortedServiceAccounts = sortServiceAccounts(serviceAccounts)

  if (sortedServiceAccounts.length === 0) {
    return <EmptyState />
  }

  return (
    <div className='fr-grid-row fr-grid-row--gutters'>
      {sortedServiceAccounts.map(serviceAccount => (
        <div key={serviceAccount.id} className='fr-col-12 fr-col-md-6 fr-col-lg-4'>
          <div className={`fr-card fr-card--shadow h-full ${serviceAccount.isDeleted ? 'opacity-70' : ''}`}>
            <div className='fr-card__body'>
              <div className='fr-card__content'>
                <div className='flex items-start justify-between gap-2 fr-mb-2w'>
                  <h2 className='fr-card__title fr-h5 fr-mb-0'>
                    <Link href={`/comptes-service/${serviceAccount.id}`}>
                      {serviceAccount.name}
                    </Link>
                  </h2>
                  <ServiceAccountStatusBadge
                    status={serviceAccount.status}
                    label={serviceAccount.statusLabel}
                  />
                </div>

                <p className='fr-text--xs fr-mb-2w break-all'>
                  <strong>Identifiant :</strong> {serviceAccount.id}
                </p>

                {serviceAccount.description && (
                  <p className='fr-card__desc'>{serviceAccount.description}</p>
                )}

                <div className='fr-grid-row fr-grid-row--gutters fr-mt-2w'>
                  <div className='fr-col-6'>
                    <p className='fr-text--xs fr-mb-0'>Portée</p>
                    <p className='fr-text--lg fr-mb-0'>
                      {serviceAccount.scopeLabel ?? 'Tous les déclarants'}
                    </p>
                  </div>
                  <div className='fr-col-6'>
                    <p className='fr-text--xs fr-mb-0'>Identifiants</p>
                    <p className='fr-text--lg fr-mb-0'>
                      {serviceAccount.counts?.usableCredentials ?? 0}
                      <span className='fr-text--xs'> / {serviceAccount.counts?.credentials ?? 0}</span>
                    </p>
                  </div>
                </div>

                <p className='fr-text--xs fr-mt-2w fr-mb-0'>
                  Créé le {formatDate(serviceAccount.createdAt)} · {pluralize(serviceAccount.counts?.tokens || 0, 'token émis')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ServiceAccountsList
