import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'

import ProfileDetails from '@/components/account/profile-details.js'
import {getZoneTypeLabel} from '@/lib/account-profile.js'
import {
  EMAIL_VERIFICATION_PURPOSES,
  getVerificationPresentation,
  shouldDisplayEmailVerification
} from '@/lib/email-verification.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'Europe/Paris'
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris'
})

function formatDate(value, formatter = DATE_FORMATTER) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : formatter.format(date)
}

function formatZonePeriod(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)

  if (start && end) {
    return `Du ${start} au ${end}`
  }

  if (start) {
    return `Depuis le ${start}`
  }

  if (end) {
    return `Jusqu’au ${end}`
  }

  return 'Accès permanent'
}

const AccountActionLink = ({children, href}) => (
  <Link className='fr-btn fr-btn--secondary fr-btn--sm' href={href}>
    {children}
  </Link>
)

const AccountSection = ({action = null, children, id, title}) => (
  <section
    aria-labelledby={id}
    className='flex min-w-0 flex-col gap-5 border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'
  >
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <h2 className='fr-h4 fr-mb-0' id={id}>{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

const InterventionZones = ({error, zones}) => (
  <AccountSection
    id='account-zones-title'
    title='Zones d’intervention'
  >
    {error ? (
      <Alert
        severity='error'
        title='Zones indisponibles'
        description='Vos zones d’intervention n’ont pas pu être chargées. Réessayez dans quelques instants.'
      />
    ) : (
      zones.length === 0 ? (
        <p className='fr-text--sm fr-mb-0'>Aucune zone d’intervention n’est actuellement attribuée à ce compte.</p>
      ) : (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {zones.map(zone => (
            <article
              key={zone.id}
              className='flex flex-col gap-3 border border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4'
            >
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <h3 className='fr-h6 fr-mb-0'>{zone.name}</h3>
                <span className='fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon'>
                  {getZoneTypeLabel(zone.type)}
                </span>
              </div>
              <p className='fr-text--sm fr-mb-0'>{formatZonePeriod(zone.startDate, zone.endDate)}</p>
            </article>
          ))}
        </div>
      )
    )}
  </AccountSection>
)

const EmailDetails = ({initialNow, user}) => {
  const displayedVerifications = (user.emailVerifications ?? [])
    .filter(verification => shouldDisplayEmailVerification(verification))

  return (
    <AccountSection
      action={(
        <AccountActionLink href='/mon-compte/adresses-email'>
          Gérer mes adresses e-mail
        </AccountActionLink>
      )}
      id='account-emails-title'
      title='Adresses e-mail'
    >
      <dl className='m-0 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2'>
        <div>
          <dt className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>Adresse principale</dt>
          <dd className='fr-text--sm fr-mb-0 break-all'>{user.email || 'Non renseigné'}</dd>
        </div>
        <div>
          <dt className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>Autres adresses de connexion</dt>
          <dd className='fr-text--sm fr-mb-0'>
            {(user.emailAliases ?? []).length > 0 ? (
              <ul className='m-0 flex list-none flex-col gap-1 p-0'>
                {user.emailAliases.map(alias => (
                  <li key={alias.id ?? alias.email} className='break-all'>{alias.email}</li>
                ))}
              </ul>
            ) : 'Aucune autre adresse'}
          </dd>
        </div>
      </dl>

      {displayedVerifications.length > 0 && (
        <div className='border-t border-[var(--border-default-grey)] pt-4'>
          <h3 className='fr-h6 fr-mb-2w'>Demandes en cours</h3>
          <ul className='m-0 flex list-none flex-col gap-3 p-0'>
            {displayedVerifications.map(verification => {
              const presentation = getVerificationPresentation(verification, initialNow)
              const purposeLabel = verification.purpose === EMAIL_VERIFICATION_PURPOSES.primary
                ? 'Nouvelle adresse principale'
                : 'Nouvelle adresse de connexion'

              return (
                <li
                  key={verification.id}
                  className='flex flex-wrap items-center justify-between gap-3 bg-[var(--background-alt-grey)] p-3'
                >
                  <div className='min-w-0'>
                    <p className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>{purposeLabel}</p>
                    <p className='fr-text--sm fr-mb-0 break-all'>{verification.email}</p>
                  </div>
                  <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${presentation.badgeClassName}`}>
                    {presentation.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </AccountSection>
  )
}

const SecurityDetails = ({canManageSecurity, lastLoginAt}) => {
  const lastLogin = formatDate(lastLoginAt, DATE_TIME_FORMATTER)

  return (
    <AccountSection
      action={canManageSecurity ? (
        <AccountActionLink href='/mon-compte/securite'>
          Gérer la sécurité
        </AccountActionLink>
      ) : null}
      id='account-security-title'
      title='Sécurité'
    >
      <dl className='m-0'>
        <div>
          <dt className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>Dernière connexion</dt>
          <dd className='fr-text--sm fr-mb-0'>
            {lastLogin
              ? <time dateTime={lastLoginAt}>{lastLogin}</time>
              : 'Aucune connexion enregistrée'}
          </dd>
        </div>
      </dl>
    </AccountSection>
  )
}

const AccountPage = ({
  canManageSecurity = false,
  initialNow,
  initialUser,
  profileUpdated = false,
  role,
  zones = [],
  zonesError = false
}) => (
  <div className='min-h-screen bg-[#f7f7fb] pb-12'>
    <div className='fr-container pt-8 md:pt-10'>
      <header className='mx-auto mb-6 max-w-5xl'>
        <h1 className='fr-h2 fr-mb-2w'>Mon compte</h1>
        <p className='fr-text--sm fr-mb-0 text-[var(--text-default-grey)]'>
          Consultez vos informations et gérez votre compte.
        </p>
      </header>

      <div className='mx-auto flex max-w-5xl flex-col gap-6'>
        {profileUpdated && (
          <Alert
            severity='success'
            title='Informations enregistrées'
            description='Votre profil a bien été mis à jour.'
          />
        )}

        <AccountSection
          action={(
            <AccountActionLink href='/mon-compte/modifier'>
              Modifier mes informations
            </AccountActionLink>
          )}
          id='account-profile-title'
          title='Informations'
        >
          <ProfileDetails role={role} user={initialUser} />
        </AccountSection>

        <EmailDetails initialNow={initialNow} user={initialUser} />

        <SecurityDetails
          canManageSecurity={canManageSecurity}
          lastLoginAt={initialUser.lastLoginAt}
        />

        {role === 'INSTRUCTOR' && (
          <InterventionZones
            error={zonesError}
            zones={zones}
          />
        )}

        <section aria-labelledby='account-personal-data-title'>
          <h2 className='sr-only' id='account-personal-data-title'>Données personnelles</h2>
          <p className='fr-text--xs fr-mb-0 text-[var(--text-mention-grey)]'>
            Vous pouvez demander l’accès, la rectification ou la suppression de vos données à{' '}
            <a href='mailto:contact@partageonsleau.beta.gouv.fr'>contact@partageonsleau.beta.gouv.fr</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
)

export default AccountPage
