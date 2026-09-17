import {forbidden} from 'next/navigation'

import DashboardPage from '@/components/dashboard/dashboard-page.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDashboardTerritoryAction} from '@/server/actions/dashboard.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

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
  const userResult = await getCurrentSessionInfo()
  const role = userResult.success ? userResult.data?.role : null
  if (role === 'INSTRUCTOR' && !userResult.data?.permissions?.includes('zone.dashboard.read')) {
    forbidden()
  }

  const sessionUser = userResult.success ? userResult.data?.user : null
  const user = sessionUser
    ? {
      id: sessionUser.id,
      declarantRole: userResult.data?.declarantRole ?? sessionUser.declarantRole,
      firstName: sessionUser.firstName,
      lastName: sessionUser.lastName,
      name: sessionUser.name,
      socialReason: sessionUser.socialReason,
      role
    }
    : null
  const isDeclarant = role === 'DECLARANT'
  const [
    dashboardResult,
    declarationTypesResult
  ] = await Promise.all([
    getDashboardTerritoryAction({
      includePoints: false,
      period: requestedPeriod,
      periodType: requestedPeriodType,
      waterBodyType: requestedWaterBodyType,
      waterBodyTypes: requestedWaterBodyTypes,
      year: requestedYear,
      zoneCodes: requestedZoneCodes
    }),
    isDeclarant
      ? getAllowedDeclarationTypesAction({includePreleveurs: false})
      : Promise.resolve(null)
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
        initialDashboard={dashboardResult.success ? dashboardResult.data : null}
        initialError={dashboardResult.success ? null : dashboardResult.error}
        user={user}
      />
    </>
  )
}

export default Page
