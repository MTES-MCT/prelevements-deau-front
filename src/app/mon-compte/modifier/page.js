import AccountRouteLayout, {AccountUnavailable} from '@/components/account/account-route-layout.js'
import ProfileForm from '@/components/account/profile-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAccountPageData} from '@/server/account-page-data.js'

export const metadata = {
  title: 'Modifier mes informations'
}

export const dynamic = 'force-dynamic'

const AccountProfileEditPage = async () => {
  const account = await getAccountPageData({callbackUrl: '/mon-compte/modifier'})

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
        description='Modifiez votre identité et vos coordonnées.'
        title='Modifier mes informations'
      >
        <section
          aria-labelledby='account-profile-form-title'
          className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'
        >
          <h2 className='sr-only' id='account-profile-form-title'>Informations du profil</h2>
          <ProfileForm standalone initialUser={account.user} role={account.role} />
        </section>
      </AccountRouteLayout>
    </>
  )
}

export default AccountProfileEditPage
