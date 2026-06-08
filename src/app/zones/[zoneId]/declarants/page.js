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

  const [zoneResult, declarantsResult, collecteursResult, pointsResult, exploitationsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarantsAction(zoneId, listOptions),
    getZoneCollecteursAction(zoneId, {perPage: 1}),
    getZonePointsPrelevementAction(zoneId, {perPage: 1}),
    getZoneExploitationsAction(zoneId, {perPage: 1})
  ])

  if (!zoneResult.success || !zoneResult.data || !declarantsResult.success) {
    notFound()
  }

  const declarantsPayload = unwrapPaginatedData(declarantsResult.data)
  const collecteursPayload = collecteursResult.success ? unwrapPaginatedData(collecteursResult.data) : {meta: {totalAll: 0}}
  const pointsPayload = pointsResult.success ? unwrapPaginatedData(pointsResult.data) : {meta: {totalAll: 0}}
  const exploitationsPayload = exploitationsResult.success ? unwrapPaginatedData(exploitationsResult.data) : {meta: {totalAll: 0}}
  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll,
    declarantsCount: declarantsPayload.meta.totalAll,
    preleveursCount: declarantsPayload.meta.filters?.declarantRole === 'PRELEVEUR'
      ? declarantsPayload.meta.total
      : undefined,
    collecteursCount: collecteursPayload.meta.totalAll,
    exploitationsCount: exploitationsPayload.meta.totalAll
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Déclarants' />
        <ZoneHeader zone={zone} currentSection='declarants' />
        <ZoneSubNavigation zone={zone} current='declarants' />
        <ZoneDeclarantsList declarants={declarantsPayload.data} meta={declarantsPayload.meta} zone={zone} />
      </Box>
    </>
  )
}

export default Page
