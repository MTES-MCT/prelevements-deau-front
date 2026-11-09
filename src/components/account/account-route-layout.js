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

export const AccountUnavailable = ({requiresAccountSelection = false, canSwitchPreleveur = false}) => (
  <AccountRouteLayout title='Mon compte'>
    <Alert
      severity={requiresAccountSelection ? 'info' : 'error'}
      title={requiresAccountSelection ? 'La gestion du compte n’est pas disponible pour cet établissement' : 'Compte indisponible'}
      description={requiresAccountSelection
        ? undefined
        : 'Vos informations n’ont pas pu être chargées. Réessayez dans quelques instants.'}
    />
    {requiresAccountSelection && (
      <Link className='fr-btn fr-mt-3w' href={canSwitchPreleveur ? '/choisir-preleveur' : '/tableau-de-bord'}>
        {canSwitchPreleveur ? 'Changer d’établissement' : 'Retour au tableau de bord'}
      </Link>
    )}
  </AccountRouteLayout>
)

export default AccountRouteLayout
