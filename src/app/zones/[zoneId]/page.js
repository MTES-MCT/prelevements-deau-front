import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneOverviewCards from '@/components/zones/zone-overview-cards.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneCollecteursAction,
  getZoneDeclarantsAction,
  getZoneExploitationsAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Zone', result.success && result.data?.name], 'Zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const [zoneResult, pointsResult, declarantsResult, collecteursResult, exploitationsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZonePointsPrelevementAction(zoneId, {perPage: 1}),
    getZoneDeclarantsAction(zoneId, {perPage: 1, declarantRole: 'PRELEVEUR'}),
    getZoneCollecteursAction(zoneId, {perPage: 1}),
    getZoneExploitationsAction(zoneId, {perPage: 1})
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  const pointsPayload = pointsResult.success ? unwrapPaginatedData(pointsResult.data) : {meta: {totalAll: 0}}
  const declarantsPayload = declarantsResult.success ? unwrapPaginatedData(declarantsResult.data) : {meta: {totalAll: 0}}
  const collecteursPayload = collecteursResult.success ? unwrapPaginatedData(collecteursResult.data) : {meta: {totalAll: 0}}
  const exploitationsPayload = exploitationsResult.success ? unwrapPaginatedData(exploitationsResult.data) : {meta: {totalAll: 0}}

  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll,
    preleveursCount: declarantsPayload.meta.totalAll,
    declarantsCount: declarantsPayload.meta.totalAll,
    collecteursCount: collecteursPayload.meta.totalAll,
    exploitationsCount: exploitationsPayload.meta.totalAll
  }

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
