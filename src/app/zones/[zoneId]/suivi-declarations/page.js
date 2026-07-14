import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarationMonthlyMatrix from '@/components/zones/zone-declaration-monthly-matrix.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneDeclarationMonthlyStatusAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Suivi des déclarations', result.success && result.data?.name], 'Suivi des déclarations')
}

export const dynamic = 'force-dynamic'

function readMatrixOptions(searchParams = {}) {
  const months = Number.parseInt(searchParams.months || searchParams.periodCount || '12', 10)
  const to = typeof searchParams.to === 'string' && /^\d{4}-\d{2}$/.test(searchParams.to)
    ? searchParams.to
    : undefined

  return {
    months: Number.isFinite(months) && months > 0 ? months : 12,
    to
  }
}

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const resolvedSearchParams = await searchParams
  const matrixOptions = readMatrixOptions(resolvedSearchParams)

  const [zoneResult, matrixResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarationMonthlyStatusAction(zoneId, matrixOptions)
  ])

  if (!zoneResult.success || !zoneResult.data || !matrixResult.success || !matrixResult.data) {
    notFound()
  }

  const zone = zoneResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Suivi déclarations' />
        <ZoneHeader zone={zone} currentSection='suivi-declarations' />
        <ZoneSubNavigation zone={zone} current='suivi-declarations' />
        <ZoneDeclarationMonthlyMatrix
          canExport={zone.permissions?.includes('declaration.followup.export')}
          payload={matrixResult.data}
        />
      </Box>
    </>
  )
}

export default Page
