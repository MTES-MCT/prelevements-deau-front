import {Box} from '@mui/material'
import {forbidden, notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZonePointForm from '@/components/zones/zone-point-form.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneGeometryAction,
  getZonePointPrelevementAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId, pointId} = await params
  const [zoneResult, pointResult] = await Promise.all([
    getZoneAction(zoneId),
    getZonePointPrelevementAction(zoneId, pointId)
  ])

  return buildPageTitle([
    'Modifier un point de prélèvement',
    pointResult.success && pointResult.data?.name,
    zoneResult.success && zoneResult.data?.name
  ], 'Modifier un point de prélèvement de zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId, pointId} = await params

  const [zoneResult, pointResult, zoneGeometryResult] = await Promise.all([
    getZoneAction(zoneId),
    getZonePointPrelevementAction(zoneId, pointId),
    getZoneGeometryAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data || !pointResult.success || !pointResult.data) {
    notFound()
  }

  const zone = zoneResult.data
  const point = pointResult.data

  if (!zone.permissions?.includes('pp.update') || !point.right?.canEdit) {
    forbidden()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Modifier un point de prélèvement'
          segments={[{label: 'Points de prélèvement', linkProps: {href: `/zones/${zone.id}/points-prelevement`}}]}
        />
        <ZoneHeader zone={zone} currentSection='points' />
        <ZoneSubNavigation zone={zone} current='points' />
        <ZonePointForm
          mode='edit'
          point={point}
          zone={zone}
          zoneGeometry={zoneGeometryResult.success ? zoneGeometryResult.data : null}
        />
      </Box>
    </>
  )
}

export default Page
