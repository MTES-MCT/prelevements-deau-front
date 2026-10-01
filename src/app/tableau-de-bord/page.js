import {Suspense} from 'react'

import {forbidden} from 'next/navigation'

import DashboardPage from '@/components/dashboard/dashboard-page.js'
import DashboardDeclarationActions from '@/components/dashboard/dashboard-declaration-actions.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDashboardTerritoryAction} from '@/server/actions/dashboard.js'
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
  const initialFilters = {
    includePoints: false,
    period: requestedPeriod,
    periodType: requestedPeriodType,
    waterBodyType: requestedWaterBodyType,
    waterBodyTypes: requestedWaterBodyTypes,
    year: requestedYear,
    zoneCodes: requestedZoneCodes
  }
  // The map and declaration actions must not wait for historical aggregations.
  // Declarants do not display the territorial point-count/usage tiles either.
  const dashboardResult = await getDashboardTerritoryAction({
    ...initialFilters,
    sections: isDeclarant ? ['context'] : ['context', 'metrics']
  })

  return (
    <>
      <StartDsfrOnHydration />

      <DashboardPage
        // A server refresh can change accessible zones or point counts without
        // changing the URL. Reset client-owned filters/data for that snapshot.
        key={JSON.stringify([user?.id, initialFilters, dashboardResult])}
        declarationActions={isDeclarant ? (
          <Suspense fallback={<div className='min-h-32 p-5 text-gray-600' role='status'>Chargement de vos déclarations…</div>}>
            <DashboardDeclarationActions isPreleveur={user?.declarantRole !== 'COLLECTEUR'} />
          </Suspense>
        ) : null}
        initialDashboard={dashboardResult.success ? dashboardResult.data : null}
        initialError={dashboardResult.success ? null : dashboardResult.error}
        initialFilters={initialFilters}
        user={user}
      />
    </>
  )
}

export default Page
