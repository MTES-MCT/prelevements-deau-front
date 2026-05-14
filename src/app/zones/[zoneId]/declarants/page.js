import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarantsList from '@/components/zones/zone-declarants-list.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneDeclarantsAction
} from '@/server/actions/zones.js'

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const [zoneResult, declarantsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarantsAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  if (!declarantsResult.success) {
    notFound()
  }

  const zone = zoneResult.data
  const declarants = declarantsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Déclarants' />

        <ZoneHeader zone={zone} currentSection='declarants' />

        <ZoneSubNavigation zone={zone} current='declarants' />

        <ZoneDeclarantsList declarants={declarants} />
      </Box>
    </>
  )
}

export default Page
