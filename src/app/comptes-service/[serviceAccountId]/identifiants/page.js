import {notFound} from 'next/navigation'

import ServiceAccountBreadcrumb from '@/components/service-accounts/service-account-breadcrumb.js'
import ServiceAccountCredentials from '@/components/service-accounts/service-account-credentials.js'
import ServiceAccountHeader from '@/components/service-accounts/service-account-header.js'
import ServiceAccountSubNavigation from '@/components/service-accounts/service-account-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getServiceAccountAction} from '@/server/actions/service-accounts.js'

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {serviceAccountId} = await params
  const result = await getServiceAccountAction(serviceAccountId)

  if (!result.success || !result.data) {
    notFound()
  }

  const serviceAccount = result.data

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ServiceAccountBreadcrumb serviceAccount={serviceAccount} currentPageLabel='Identifiants techniques' />
        <ServiceAccountHeader serviceAccount={serviceAccount} currentSection='credentials' />
        <ServiceAccountSubNavigation serviceAccount={serviceAccount} current='credentials' />
        <ServiceAccountCredentials serviceAccount={serviceAccount} />
      </div>
    </>
  )
}

export default Page
