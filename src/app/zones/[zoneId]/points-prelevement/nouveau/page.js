import {Box} from '@mui/material'
import {forbidden, notFound} from 'next/navigation'

import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZonePointForm from '@/components/zones/zone-point-form.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneDeclarantsAction,
  getZoneExploitationsAction,
  getZoneGeometryAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params
  const [zoneResult, zoneGeometryResult, pointsResult, declarantsResult, exploitationsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneGeometryAction(zoneId),
    getZonePointsPrelevementAction(zoneId, {perPage: 1}),
    getZoneDeclarantsAction(zoneId, {perPage: 1}),
    getZoneExploitationsAction(zoneId, {perPage: 1})
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  const pointsPayload = pointsResult.success ? unwrapPaginatedData(pointsResult.data) : {meta: {totalAll: 0}}
  const declarantsPayload = declarantsResult.success ? unwrapPaginatedData(declarantsResult.data) : {meta: {totalAll: 0}}
  const exploitationsPayload = exploitationsResult.success ? unwrapPaginatedData(exploitationsResult.data) : {meta: {totalAll: 0}}
  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll,
    declarantsCount: declarantsPayload.meta.totalAll,
    exploitationsCount: exploitationsPayload.meta.totalAll
  }

  if (!zone.isAdmin) {
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
