import {AccountUnavailable} from '@/components/account/account-route-layout.js'
import AccountSecurityPage from '@/components/account/account-security-page.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAccountPageData} from '@/server/account-page-data.js'

export const metadata = {
  title: 'Sécurité'
}

export const dynamic = 'force-dynamic'

const SecurityPage = async () => {
  const account = await getAccountPageData({callbackUrl: '/mon-compte/securite'})

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
      <AccountSecurityPage
        initialUser={account.user}
        isImpersonating={account.isImpersonating}
      />
    </>
  )
}

export default SecurityPage
