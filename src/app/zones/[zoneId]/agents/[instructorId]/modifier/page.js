import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneInstructorEditActions from '@/components/zones/zone-instructor-edit-actions.js'
import ZoneInstructorForm from '@/components/zones/zone-instructor-form.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneInstructorAction
} from '@/server/actions/zones.js'

function getInstructorName(instructor) {
  const fullName = [instructor?.firstName, instructor?.lastName].filter(Boolean).join(' ').trim()
  return fullName || instructor?.email || null
}

export async function generateMetadata({params}) {
  const {zoneId, instructorId} = await params
  const [zoneResult, instructorResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneInstructorAction(zoneId, instructorId)
  ])

  return buildPageTitle([
    'Modifier un agent',
    getInstructorName(instructorResult.success && instructorResult.data),
    zoneResult.success && zoneResult.data?.name
  ], 'Modifier un agent')
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

  if (!zone.isAdmin) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Modifier un agent'
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

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start'>
          <ZoneInstructorForm zone={zone} instructor={instructor} />
          <ZoneInstructorEditActions zone={zone} instructor={instructor} />
        </div>
      </Box>
    </>
  )
}

export default Page
