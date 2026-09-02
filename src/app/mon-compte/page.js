import AccountPage from '@/components/account/account-page.js'
import {AccountUnavailable} from '@/components/account/account-route-layout.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {AUTH_METHODS, hasAuthMethod} from '@/lib/auth-methods.js'
import {getAccountPageData} from '@/server/account-page-data.js'
import {getAccountZonesAction} from '@/server/actions/zones.js'
import {getAuthConfigState} from '@/server/auth-config.js'

export const metadata = {
  title: 'Mon compte'
}

export const dynamic = 'force-dynamic'

const MonComptePage = async ({searchParams}) => {
  const [{updated}, account, authConfigState] = await Promise.all([
    searchParams ?? {},
    getAccountPageData(),
    getAuthConfigState()
  ])

  if (!account.available) {
    return (
      <>
        <StartDsfrOnHydration />
        <AccountUnavailable />
      </>
    )
  }

  const {role, user} = account

  let zones = []
  let zonesError = false

  if (role === 'INSTRUCTOR') {
    const zonesResult = await getAccountZonesAction()

    zonesError = !zonesResult?.success
    zones = zonesResult?.success ? (zonesResult.data ?? []) : []
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AccountPage
        canManageSecurity={authConfigState.available
          && hasAuthMethod(authConfigState.config, AUTH_METHODS.PASSWORD)
          && !account.isImpersonating}
        initialNow={Date.now()}
        initialUser={user}
        profileUpdated={updated === 'profile'}
        role={role}
        zones={zones}
        zonesError={zonesError}
      />
    </>
  )
}

export default MonComptePage
