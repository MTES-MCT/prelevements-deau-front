import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {redirect} from 'next/navigation'

import AccountPage from '@/components/account/account-page.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {
  getAccountZonesAction,
  getZoneAgentPermissionsAction
} from '@/server/actions/zones.js'

export const metadata = {
  title: 'Mon compte'
}

export const dynamic = 'force-dynamic'

const MonComptePage = async () => {
  const userResult = await getCurrentUser()
  const user = userResult?.data?.user ?? null
  const role = userResult?.data?.role ?? null

  if (userResult?.code === 401) {
    redirect('/login?error=session_expired')
  }

  if (!userResult?.success || !user || !role) {
    return (
      <>
        <StartDsfrOnHydration />
        <div className='min-h-screen bg-[#f7f7fb] pb-12'>
          <div className='fr-container pt-8 md:pt-10'>
            <div className='max-w-3xl'>
              <h1 className='fr-h2'>Mon compte</h1>
              <Alert
                severity='error'
                title='Compte indisponible'
                description='Vos informations n’ont pas pu être chargées. Réessayez dans quelques instants.'
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  let zones = []
  let zonesError = false
  let zonePermissionCatalog = null

  if (role === 'INSTRUCTOR') {
    const [zonesResult, catalogResult] = await Promise.all([
      getAccountZonesAction(),
      getZoneAgentPermissionsAction()
    ])

    zonesError = !zonesResult?.success
    zones = zonesResult?.success ? (zonesResult.data ?? []) : []
    zonePermissionCatalog = catalogResult?.success ? catalogResult.data : null
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AccountPage
        initialNow={Date.now()}
        initialUser={user}
        isImpersonating={Boolean(userResult.data.impersonation?.active)}
        role={role}
        zonePermissionCatalog={zonePermissionCatalog}
        zones={zones}
        zonesError={zonesError}
      />
    </>
  )
}

export default MonComptePage
