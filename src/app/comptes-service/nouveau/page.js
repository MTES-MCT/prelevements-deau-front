import ServiceAccountBreadcrumb from '@/components/service-accounts/service-account-breadcrumb.js'
import ServiceAccountCreateForm from '@/components/service-accounts/service-account-create-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const dynamic = 'force-dynamic'

const Page = async () => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container fr-my-4w'>
      <ServiceAccountBreadcrumb currentPageLabel='Nouveau compte' />
      <ServiceAccountCreateForm />
    </div>
  </>
)

export default Page
