import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarantsList from '@/components/zones/zone-declarants-list.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {readListOptions, unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneCollecteursAction,
  getZoneDeclarantsAction,
  getZoneExploitationsAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

export const dynamic = 'force-dynamic'

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const listOptions = readListOptions(await searchParams)

  const [zoneResult, collecteursResult, declarantsResult, pointsResult, exploitationsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneCollecteursAction(zoneId, listOptions),
    getZoneDeclarantsAction(zoneId, {perPage: 1, declarantRole: 'PRELEVEUR'}),
    getZonePointsPrelevementAction(zoneId, {perPage: 1}),
    getZoneExploitationsAction(zoneId, {perPage: 1})
  ])

  if (!zoneResult.success || !zoneResult.data || !collecteursResult.success) {
    notFound()
  }

  const collecteursPayload = unwrapPaginatedData(collecteursResult.data)
  const declarantsPayload = declarantsResult.success ? unwrapPaginatedData(declarantsResult.data) : {meta: {totalAll: 0}}
  const pointsPayload = pointsResult.success ? unwrapPaginatedData(pointsResult.data) : {meta: {totalAll: 0}}
  const exploitationsPayload = exploitationsResult.success ? unwrapPaginatedData(exploitationsResult.data) : {meta: {totalAll: 0}}
  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll,
    declarantsCount: declarantsPayload.meta.totalAll,
    preleveursCount: declarantsPayload.meta.totalAll,
    collecteursCount: collecteursPayload.meta.totalAll,
    exploitationsCount: exploitationsPayload.meta.totalAll
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Collecteurs' />
        <ZoneHeader zone={zone} currentSection='collecteurs' />
        <ZoneSubNavigation zone={zone} current='collecteurs' />
        <ZoneDeclarantsList collecteursOnly declarants={collecteursPayload.data} meta={collecteursPayload.meta} zone={zone} />
      </Box>
    </>
  )
}

export default Page
