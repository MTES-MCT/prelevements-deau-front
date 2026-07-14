import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZonesList from '@/components/zones/zones-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {getZonesAction} from '@/server/actions/zones.js'

export const metadata = {
  title: 'Zones'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const [result, userResult] = await Promise.all([
    getZonesAction(),
    getCurrentUser()
  ])
  const zones = result.data || []
  const isGlobalAdmin = userResult?.data?.role === 'ADMIN'
  const pageLabel = isGlobalAdmin ? 'Zones' : 'Mes zones'

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-6 md:pt-8'>
          <ZoneBreadcrumb currentPageLabel={pageLabel} />

          <div className='mb-6'>
            <h1 className='fr-h2 fr-mb-2w'>{pageLabel}</h1>
            <p className='fr-text--sm fr-mb-0 text-gray-700'>
              {isGlobalAdmin
                ? 'Consultez les territoires configurés, leurs rattachements et leur niveau d’activité.'
                : 'Consultez les territoires auxquels vous avez accès et leurs principaux rattachements.'}
            </p>
          </div>

          <ZonesList isGlobalAdmin={isGlobalAdmin} zones={zones} />
        </div>
      </main>
    </>
  )
}

export default Page
