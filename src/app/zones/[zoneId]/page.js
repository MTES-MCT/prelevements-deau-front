import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneOverviewCards from '@/components/zones/zone-overview-cards.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getZoneAction} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Zone', result.success && result.data?.name], 'Zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const zoneResult = await getZoneAction(zoneId)

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  const zone = zoneResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel={zone.name} />
        <ZoneHeader zone={zone} currentSection='overview' />
        <ZoneSubNavigation zone={zone} current='overview' />
        <ZoneOverviewCards zone={zone} />
      </Box>
    </>
  )
}

export default Page
