import {forbidden} from 'next/navigation'

import DashboardPage from '@/components/dashboard/dashboard-page.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDashboardPiezometryAction,
  getDashboardRiverFlowsAction,
  getDashboardTerritoryAction
} from '@/server/actions/dashboard.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Tableau de bord'
}

export const dynamic = 'force-dynamic'

function splitZoneCodes(value) {
  const values = Array.isArray(value) ? value : [value]

  return [
    ...new Set(
      values
        .flatMap(item => String(item ?? '').split(','))
        .map(item => item.trim())
        .filter(Boolean)
    )
  ]
}

function getSearchParamValue(value) {
  return Array.isArray(value) ? value[0] : value
}

const Page = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const requestedZoneCodes = splitZoneCodes(resolvedSearchParams?.zones)
  const requestedPeriodType = getSearchParamValue(resolvedSearchParams?.periodType)
  const requestedPeriod = getSearchParamValue(resolvedSearchParams?.period)
  const requestedYear = getSearchParamValue(resolvedSearchParams?.year)
  const requestedWaterBodyTypes = getSearchParamValue(resolvedSearchParams?.waterBodyTypes)
  const requestedWaterBodyType = getSearchParamValue(resolvedSearchParams?.waterBodyType)
  const userResult = await getCurrentUser()
  const role = userResult.success ? userResult.data?.role : null
  if (role === 'INSTRUCTOR' && !userResult.data?.permissions?.includes('zone.dashboard.read')) {
    forbidden()
  }

  const user = userResult.success && userResult.data?.user
    ? {
      ...userResult.data.user,
      role
    }
    : null
  const isDeclarant = role === 'DECLARANT'
  const isCollector = isDeclarant && user?.declarantRole === 'COLLECTEUR'
  const shouldLoadDeclarantSeries = isDeclarant && !isCollector && user?.id
  const [
    dashboardResult,
    declarationTypesResult,
    seriesOptionsResult,
    piezometryResult,
    riverFlowsResult
  ] = await Promise.all([
    getDashboardTerritoryAction({
      period: requestedPeriod,
      periodType: requestedPeriodType,
      waterBodyType: requestedWaterBodyType,
      waterBodyTypes: requestedWaterBodyTypes,
      year: requestedYear,
      zoneCodes: requestedZoneCodes
    }),
    isDeclarant ? getAllowedDeclarationTypesAction() : Promise.resolve(null),
    shouldLoadDeclarantSeries
      ? getAggregatedSeriesOptionsAction({preleveurId: user.id})
      : Promise.resolve(null),
    getDashboardPiezometryAction({
      zoneCodes: requestedZoneCodes,
      period: 'year',
      includeIps: true
    }),
    getDashboardRiverFlowsAction({zoneCodes: requestedZoneCodes, period: 'week'})
  ])
  const declarationTypesResponse = declarationTypesResult?.success ? declarationTypesResult.data : null
  const declarationCreation = isDeclarant
    ? {
      ...declarationTypesResponse?.meta,
      allowedDeclarationTypes: declarationTypesResponse?.data ?? []
    }
    : null

  return (
    <>
      <StartDsfrOnHydration />

      <DashboardPage
        declarationCreation={declarationCreation}
        declarantSeriesOptions={seriesOptionsResult?.success ? seriesOptionsResult.data : null}
        initialDashboard={dashboardResult.success ? dashboardResult.data : null}
        initialError={dashboardResult.success ? null : dashboardResult.error}
        initialPiezometry={piezometryResult.success ? piezometryResult.data : null}
        initialPiezometryError={piezometryResult.success ? null : piezometryResult.error}
        initialRiverFlows={riverFlowsResult.success ? riverFlowsResult.data : null}
        initialRiverFlowsError={riverFlowsResult.success ? null : riverFlowsResult.error}
        user={user}
      />
    </>
  )
}

export default Page
