import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneInstructorsList from '@/components/zones/zone-instructors-list.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneInstructorsAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Agents', result.success && result.data?.name], 'Agents de la zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const [zoneResult, instructorsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneInstructorsAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  if (!instructorsResult.success) {
    notFound()
  }

  const zone = zoneResult.data
  const instructors = instructorsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Agents' />

        <ZoneHeader zone={zone} currentSection='agents' />

        <ZoneSubNavigation zone={zone} current='agents' />

        <ZoneInstructorsList zone={zone} instructors={instructors} />
      </Box>
    </>
  )
}

export default Page
