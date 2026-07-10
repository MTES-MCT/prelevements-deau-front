import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneMonitoringStations from '@/components/zones/zone-monitoring-stations.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneMonitoringStationsAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(
    ['Paramétrage des ressources', result.success && result.data?.name],
    'Paramétrage des ressources'
  )
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params
  const [zoneResult, stationsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneMonitoringStationsAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data || !stationsResult.success) {
    notFound()
  }

  const zone = zoneResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container mb-8 flex h-full w-full flex-col gap-5'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Paramétrage des ressources' />
        <ZoneHeader zone={zone} currentSection='monitoring-stations' />
        <ZoneSubNavigation zone={zone} current='monitoring-stations' />
        <ZoneMonitoringStations
          initialStations={stationsResult.data ?? []}
          zone={zone}
        />
      </Box>
    </>
  )
}

export default Page
