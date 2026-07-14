import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneInstructorForm from '@/components/zones/zone-instructor-form.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneAgentPermissionsAction,
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
    'Droits et période',
    getInstructorName(instructorResult.success && instructorResult.data),
    zoneResult.success && zoneResult.data?.name
  ], 'Droits et période')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId, instructorId} = await params

  const [zoneResult, instructorResult, catalogResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneInstructorAction(zoneId, instructorId),
    getZoneAgentPermissionsAction()
  ])

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  if (!instructorResult.success || !instructorResult.data || !catalogResult.success || !catalogResult.data) {
    notFound()
  }

  const zone = zoneResult.data
  const instructor = instructorResult.data

  if (!zone.permissions?.includes('zone.agent.update') || instructor.isCurrentUser) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Droits et période'
          segments={[
            {
              label: 'Agents',
              linkProps: {
                href: `/zones/${zone.id}/agents`
              }
            },
            {
              label: getInstructorName(instructor),
              linkProps: {
                href: `/zones/${zone.id}/agents/${instructor.id}`
              }
            }
          ]}
        />

        <ZoneHeader zone={zone} currentSection='agents' />

        <ZoneSubNavigation zone={zone} current='agents' />

        <ZoneInstructorForm
          instructor={instructor}
          permissionCatalog={catalogResult.data}
          zone={zone}
        />
      </Box>
    </>
  )
}

export default Page
