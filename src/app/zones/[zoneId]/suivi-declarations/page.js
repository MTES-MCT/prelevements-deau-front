import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarationMonthlyMatrix from '@/components/zones/zone-declaration-monthly-matrix.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneCollecteursAction,
  getZoneDeclarationMonthlyStatusAction,
  getZoneDeclarantsAction,
  getZoneExploitationsAction,
  getZonePointsPrelevementAction
} from '@/server/actions/zones.js'

export const dynamic = 'force-dynamic'

function readMatrixOptions(searchParams = {}) {
  const months = Number.parseInt(searchParams.months || '12', 10)
  const to = typeof searchParams.to === 'string' ? searchParams.to : undefined

  return {
    months: Number.isFinite(months) && months > 0 ? months : 12,
    to
  }
}

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const resolvedSearchParams = await searchParams
  const matrixOptions = readMatrixOptions(resolvedSearchParams)

  const [
    zoneResult,
    matrixResult,
    preleveursResult,
    collecteursResult,
    pointsResult,
    exploitationsResult
  ] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarationMonthlyStatusAction(zoneId, matrixOptions),
    getZoneDeclarantsAction(zoneId, {perPage: 1, declarantRole: 'PRELEVEUR'}),
    getZoneCollecteursAction(zoneId, {perPage: 1}),
    getZonePointsPrelevementAction(zoneId, {perPage: 1}),
    getZoneExploitationsAction(zoneId, {perPage: 1})
  ])

  if (!zoneResult.success || !zoneResult.data || !matrixResult.success || !matrixResult.data) {
    notFound()
  }

  const preleveursPayload = preleveursResult.success ? unwrapPaginatedData(preleveursResult.data) : {meta: {totalAll: 0}}
  const collecteursPayload = collecteursResult.success ? unwrapPaginatedData(collecteursResult.data) : {meta: {totalAll: 0}}
  const pointsPayload = pointsResult.success ? unwrapPaginatedData(pointsResult.data) : {meta: {totalAll: 0}}
  const exploitationsPayload = exploitationsResult.success ? unwrapPaginatedData(exploitationsResult.data) : {meta: {totalAll: 0}}
  const zone = {
    ...zoneResult.data,
    pointsCount: pointsPayload.meta.totalAll,
    declarantsCount: preleveursPayload.meta.totalAll,
    preleveursCount: preleveursPayload.meta.totalAll,
    collecteursCount: collecteursPayload.meta.totalAll,
    exploitationsCount: exploitationsPayload.meta.totalAll
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Suivi déclarations' />
        <ZoneHeader zone={zone} currentSection='suivi-declarations' />
        <ZoneSubNavigation zone={zone} current='suivi-declarations' />
        <ZoneDeclarationMonthlyMatrix payload={matrixResult.data} />
      </Box>
    </>
  )
}

export default Page
