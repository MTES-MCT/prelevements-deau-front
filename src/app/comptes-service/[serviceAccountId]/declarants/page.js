import {notFound} from 'next/navigation'

import ServiceAccountBreadcrumb from '@/components/service-accounts/service-account-breadcrumb.js'
import ServiceAccountDeclarants from '@/components/service-accounts/service-account-declarants.js'
import ServiceAccountHeader from '@/components/service-accounts/service-account-header.js'
import ServiceAccountSubNavigation from '@/components/service-accounts/service-account-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getServiceAccountAction,
  listServiceAccountDeclarantOptionsAction
} from '@/server/actions/service-accounts.js'

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {serviceAccountId} = await params
  const [serviceAccountResult, declarantsResult] = await Promise.all([
    getServiceAccountAction(serviceAccountId),
    listServiceAccountDeclarantOptionsAction()
  ])

  if (!serviceAccountResult.success || !serviceAccountResult.data) {
    notFound()
  }

  const serviceAccount = serviceAccountResult.data
  const declarants = declarantsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ServiceAccountBreadcrumb serviceAccount={serviceAccount} currentPageLabel='Déclarants rattachés' />
        <ServiceAccountHeader serviceAccount={serviceAccount} currentSection='declarants' />
        <ServiceAccountSubNavigation serviceAccount={serviceAccount} current='declarants' />
        <ServiceAccountDeclarants serviceAccount={serviceAccount} declarants={declarants} />
      </div>
    </>
  )
}

export default Page
