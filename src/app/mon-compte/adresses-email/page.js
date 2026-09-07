import AccountRouteLayout, {AccountUnavailable} from '@/components/account/account-route-layout.js'
import EmailAddressesSection from '@/components/account/email-addresses-section.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAccountPageData} from '@/server/account-page-data.js'

export const metadata = {
  title: 'Mes adresses e-mail'
}

export const dynamic = 'force-dynamic'

const AccountEmailAddressesPage = async () => {
  const account = await getAccountPageData({callbackUrl: '/mon-compte/adresses-email'})

  if (!account.available) {
    return (
      <>
        <StartDsfrOnHydration />
        <AccountUnavailable />
      </>
    )
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AccountRouteLayout
        backHref='/mon-compte'
        description='Gérez les adresses utilisées pour vous connecter à votre compte.'
        title='Mes adresses e-mail'
      >
        <div className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'>
          <EmailAddressesSection
            initialAliases={account.user.emailAliases ?? []}
            initialNow={Date.now()}
            initialVerifications={account.user.emailVerifications ?? []}
            primaryEmail={account.user.email}
          />
        </div>
      </AccountRouteLayout>
    </>
  )
}

export default AccountEmailAddressesPage
