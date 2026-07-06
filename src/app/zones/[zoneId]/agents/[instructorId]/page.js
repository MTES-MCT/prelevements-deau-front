import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneInstructorDetail from '@/components/zones/zone-instructor-detail.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getInstructorName} from '@/lib/zone-instructors.js'
import {
  getZoneAction,
  getZoneInstructorAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId, instructorId} = await params
  const [zoneResult, instructorResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneInstructorAction(zoneId, instructorId)
  ])

  return buildPageTitle([
    getInstructorName(instructorResult.success && instructorResult.data),
    zoneResult.success && zoneResult.data?.name
  ], 'Agent')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId, instructorId} = await params

  const [zoneResult, instructorResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneInstructorAction(zoneId, instructorId)
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  if (!instructorResult.success || !instructorResult.data) {
    notFound()
  }

  const zone = zoneResult.data
  const instructor = instructorResult.data
  const instructorName = getInstructorName(instructor)

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel={instructorName}
          segments={[
            {
              label: 'Agents',
              linkProps: {
                href: `/zones/${zone.id}/agents`
              }
            }
          ]}
        />

        <ZoneHeader zone={zone} currentSection='agents' />

        <ZoneSubNavigation zone={zone} current='agents' />

        <ZoneInstructorDetail zone={zone} instructor={instructor} />
      </Box>
    </>
  )
}

export default Page
