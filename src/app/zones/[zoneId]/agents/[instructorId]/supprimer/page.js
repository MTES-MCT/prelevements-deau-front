import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneInstructorDeleteCard from '@/components/zones/zone-instructor-delete-card.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneInstructorAction
} from '@/server/actions/zones.js'

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

  if (!zone.isAdmin || instructor.isCurrentUser) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Retirer un agent'
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

        <ZoneInstructorDeleteCard zone={zone} instructor={instructor} />
      </Box>
    </>
  )
}

export default Page
