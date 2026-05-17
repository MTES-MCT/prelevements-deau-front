import {notFound} from 'next/navigation'

import ServiceAccountBreadcrumb from '@/components/service-accounts/service-account-breadcrumb.js'
import ServiceAccountHeader from '@/components/service-accounts/service-account-header.js'
import ServiceAccountOverview from '@/components/service-accounts/service-account-overview.js'
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
        <ServiceAccountBreadcrumb serviceAccount={serviceAccount} currentPageLabel={serviceAccount.name} />
        <ServiceAccountHeader serviceAccount={serviceAccount} currentSection='overview' />
        <ServiceAccountSubNavigation serviceAccount={serviceAccount} current='overview' />
        <ServiceAccountOverview serviceAccount={serviceAccount} />
      </div>
    </>
  )
}

export default Page
