'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'

import EmailAddressesSection from '@/components/account/email-addresses-section.js'
import ProfileForm from '@/components/account/profile-form.js'
import PasswordChangeSection from '@/components/auth/password-change-section.js'
import {
  getPermissionGroups,
  getZoneTypeLabel
} from '@/lib/account-profile.js'

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

const AccountSection = ({id, title, children}) => (
  <section
    aria-labelledby={id}
    className='flex min-w-0 flex-col gap-5 border border-gray-200 bg-white p-5 md:p-6'
  >
    <h2 className='fr-h4 fr-mb-0' id={id}>{title}</h2>
    {children}
  </section>
)

const ZonePermissionDetails = ({catalog, zone}) => {
  if (zone.isAdmin) {
    return (
      <span className='fr-badge fr-badge--sm fr-badge--success fr-badge--no-icon'>
        Accès complet
      </span>
    )
  }

  const groups = getPermissionGroups(catalog, zone.permissions)
  const permissionCount = zone.permissions?.length ?? 0

  return (
    <details>
      <summary className='cursor-pointer fr-text--sm fr-text--bold'>
        Voir les accès disponibles
      </summary>
      {groups.length > 0 ? (
        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
          {groups.map(group => (
            <div key={group.code}>
              <p className='fr-text--xs fr-text--bold fr-mb-1v'>{group.label}</p>
              <ul className='fr-text--xs fr-mb-0 pl-5'>
                {group.permissions.map(permission => (
                  <li key={permission.code}>{permission.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className='fr-text--xs fr-mt-2w fr-mb-0'>
          {permissionCount > 0
            ? 'Le détail de ces droits est temporairement indisponible.'
            : 'Aucun droit particulier n’est attribué.'}
        </p>
      )}
    </details>
  )
}

const InterventionZones = ({catalog, error, zones}) => (
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
              className='flex flex-col gap-3 border border-gray-200 bg-[var(--background-alt-grey)] p-4'
            >
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <h3 className='fr-h6 fr-mb-0'>{zone.name}</h3>
                <span className='fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon'>
                  {getZoneTypeLabel(zone.type)}
                </span>
              </div>
              <p className='fr-text--sm fr-mb-0'>{formatZonePeriod(zone.startDate, zone.endDate)}</p>
              <ZonePermissionDetails catalog={catalog} zone={zone} />
            </article>
          ))}
        </div>
      )
    )}
  </AccountSection>
)

const AccountPage = ({
  initialNow,
  initialUser,
  isImpersonating = false,
  role,
  zonePermissionCatalog = null,
  zones = [],
  zonesError = false
}) => {
  const lastLogin = formatDate(initialUser.lastLoginAt, DATE_TIME_FORMATTER)

  return (
    <div className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-8 md:pt-10'>
        <header className='mx-auto mb-6 max-w-5xl'>
          <h1 className='fr-h2 fr-mb-2w'>Mon compte</h1>
          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            Gérez vos informations et vos accès.
          </p>
        </header>

        <div className='mx-auto flex max-w-5xl flex-col gap-6'>
          <AccountSection
            id='account-profile-title'
            title='Informations'
          >
            <ProfileForm initialUser={initialUser} role={role} />
          </AccountSection>

          <div className='min-w-0 border border-gray-200 bg-white p-5 md:p-6'>
            <EmailAddressesSection
              initialAliases={initialUser.emailAliases ?? []}
              initialNow={initialNow}
              initialVerifications={initialUser.emailVerifications ?? []}
              primaryEmail={initialUser.email}
            />
          </div>

          {role === 'INSTRUCTOR' && (
            <InterventionZones
              catalog={zonePermissionCatalog}
              error={zonesError}
              zones={zones}
            />
          )}

          <section
            aria-labelledby='account-security-title'
            className='mt-2 border-t border-gray-300 pt-5'
          >
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <h2 className='fr-h6 fr-mb-1v' id='account-security-title'>Sécurité</h2>
                <p className='fr-text--xs fr-mb-0 text-gray-600'>
                  Dernière connexion :{' '}
                  {lastLogin
                    ? <time dateTime={initialUser.lastLoginAt}>{lastLogin}</time>
                    : 'aucune connexion enregistrée'}
                </p>
              </div>

              {!isImpersonating && <PasswordChangeSection />}
            </div>
          </section>

          <section aria-labelledby='account-personal-data-title'>
            <h2 className='sr-only' id='account-personal-data-title'>Données personnelles</h2>
            <p className='fr-text--xs fr-mb-0 text-gray-600'>
              Vous pouvez demander l’accès, la rectification ou la suppression de vos données à{' '}
              <a href='mailto:contact@partageonsleau.beta.gouv.fr'>contact@partageonsleau.beta.gouv.fr</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AccountPage
