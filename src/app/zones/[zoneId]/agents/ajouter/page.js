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
  getZoneAgentPermissionsAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Ajouter un agent', result.success && result.data?.name], 'Ajouter un agent')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const [zoneResult, catalogResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneAgentPermissionsAction()
  ])

  if (!zoneResult.success || !zoneResult.data || !catalogResult.success || !catalogResult.data) {
    notFound()
  }

  const zone = zoneResult.data

  if (!zone.permissions?.includes('zone.agent.create')) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb
          zone={zone}
          currentPageLabel='Ajouter un agent'
          segments={[
            {
              label: 'Agents',
              linkProps: {
                href: `/zones/${zone.id}/agents`
              }
            }
          ]}
        />

        <ZoneHeader zone={zone} currentSection='add-agent' />

        <ZoneSubNavigation zone={zone} current='agents' />

        <ZoneInstructorForm permissionCatalog={catalogResult.data} zone={zone} />
      </Box>
    </>
  )
}

export default Page
