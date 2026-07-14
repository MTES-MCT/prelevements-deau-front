import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZonePointsList from '@/components/zones/zone-points-list.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {readListOptions, unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Points de prélèvement', result.success && result.data?.name], 'Points de prélèvement de la zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const listOptions = readListOptions(await searchParams)

  const [zoneResult, pointsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZonePointsPrelevementAction(zoneId, listOptions)
  ])

  if (!zoneResult.success || !zoneResult.data || !pointsResult.success) {
    notFound()
  }

  const pointsPayload = unwrapPaginatedData(pointsResult.data)
  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Points de prélèvement' />
        <ZoneHeader zone={zone} currentSection='points' />
        <ZoneSubNavigation zone={zone} current='points' />
        <ZonePointsList meta={pointsPayload.meta} points={pointsPayload.data} zone={zone} />
      </Box>
    </>
  )
}

export default Page
