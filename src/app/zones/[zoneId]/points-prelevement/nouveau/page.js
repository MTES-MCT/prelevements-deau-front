import {Box} from '@mui/material'
import {forbidden, notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZonePointForm from '@/components/zones/zone-point-form.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneGeometryAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Nouveau point de prélèvement', result.success && result.data?.name], 'Nouveau point de prélèvement de zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params
  const [zoneResult, zoneGeometryResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneGeometryAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  const zone = zoneResult.data

  if (!zone.permissions?.includes('pp.create')) {
    forbidden()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Nouveau point de prélèvement'
          segments={[{label: 'Points de prélèvement', linkProps: {href: `/zones/${zone.id}/points-prelevement`}}]}
        />
        <ZoneHeader zone={zone} currentSection='points' />
        <ZoneSubNavigation zone={zone} current='points' />
        <ZonePointForm mode='create' zone={zone} zoneGeometry={zoneGeometryResult.success ? zoneGeometryResult.data : null} />
      </Box>
    </>
  )
}

export default Page
