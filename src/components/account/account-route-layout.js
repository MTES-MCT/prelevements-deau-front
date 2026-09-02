import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'

const AccountRouteLayout = ({
  backHref = null,
  backLabel = 'Retour à Mon compte',
  children,
  description = null,
  title
}) => (
  <div className='min-h-screen bg-[#f7f7fb] pb-12'>
    <div className='fr-container pt-8 md:pt-10'>
      <div className='mx-auto max-w-5xl'>
        {backHref && (
          <div className='mb-6'>
            <Link
              className='fr-link fr-icon-arrow-left-line fr-link--icon-left'
              href={backHref}
            >
              {backLabel}
            </Link>
          </div>
        )}

        <header className='mb-6'>
          <h1 className='fr-h2 fr-mb-2w'>{title}</h1>
          {description && (
            <p className='fr-text--sm fr-mb-0 text-[var(--text-default-grey)]'>{description}</p>
          )}
        </header>

        {children}
      </div>
    </div>
  </div>
)

export const AccountUnavailable = () => (
  <AccountRouteLayout title='Mon compte'>
    <Alert
      severity='error'
      title='Compte indisponible'
      description='Vos informations n’ont pas pu être chargées. Réessayez dans quelques instants.'
    />
  </AccountRouteLayout>
)

export default AccountRouteLayout
