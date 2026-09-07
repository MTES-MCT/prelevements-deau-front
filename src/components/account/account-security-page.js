import AccountRouteLayout from '@/components/account/account-route-layout.js'
import PasswordChangeSection from '@/components/auth/password-change-section.js'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris'
})

function formatLastLogin(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_TIME_FORMATTER.format(date)
}

const AccountSecurityPage = ({initialUser, isImpersonating = false}) => {
  const lastLogin = formatLastLogin(initialUser.lastLoginAt)

  return (
    <AccountRouteLayout
      backHref='/mon-compte'
      description='Gérez votre mot de passe et consultez l’activité récente de votre compte.'
      title='Sécurité'
    >
      <div className='flex flex-col gap-6'>
        <section
          aria-labelledby='account-password-title'
          className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'
        >
          <h2 className='fr-h4 fr-mb-3w' id='account-password-title'>Mot de passe</h2>
          <PasswordChangeSection
            standalone
            disabled={isImpersonating}
          />
        </section>

        <section
          aria-labelledby='account-activity-title'
          className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'
        >
          <h2 className='fr-h4 fr-mb-2w' id='account-activity-title'>Activité du compte</h2>
          <p className='fr-text--sm fr-mb-0 text-[var(--text-default-grey)]'>
            Dernière connexion :{' '}
            {lastLogin
              ? <time dateTime={initialUser.lastLoginAt}>{lastLogin}</time>
              : 'aucune connexion enregistrée'}
          </p>
        </section>
      </div>
    </AccountRouteLayout>
  )
}

export default AccountSecurityPage
