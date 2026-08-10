import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ResourceMutationHistory from '@/components/audit/resource-mutation-history.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneOverviewCards from '@/components/zones/zone-overview-cards.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getResourceAuditHistoryAction} from '@/server/actions/audit-events.js'
import {getZoneAction} from '@/server/actions/zones.js'

const HISTORY_PERMISSIONS = [
  'pp.create',
  'pp.update',
  'pp.delete',
  'exploitation.create',
  'exploitation.update',
  'exploitation.delete',
  'declarant.create',
  'declarant.update',
  'declarant.delete',
  'zone.declaration.settings.update',
  'zone.declaration.override.create',
  'zone.declaration.override.update',
  'zone.declaration.override.delete',
  'zone.resource.create',
  'zone.resource.update',
  'zone.resource.delete',
  'zone.agent.create',
  'zone.agent.update',
  'zone.agent.remove'
]

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Zone', result.success && result.data?.name], 'Zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params

  const zoneResult = await getZoneAction(zoneId)

  if (!zoneResult.success || !zoneResult.data) {
    notFound()
  }

  const zone = zoneResult.data
  const canReadHistory = zone.isAdmin
    || HISTORY_PERMISSIONS.some(permission => zone.permissions?.includes(permission))
  const historyResult = canReadHistory
    ? await getResourceAuditHistoryAction('ZONE', zone.id)
    : {success: false}

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel={zone.name} />
        <ZoneHeader zone={zone} currentSection='overview' />
        <ZoneSubNavigation zone={zone} current='overview' />
        <ZoneOverviewCards zone={zone} />
        {historyResult.success && (
          <ResourceMutationHistory
            initialData={historyResult.data?.data}
            resourceId={zone.id}
            resourceType='ZONE'
          />
        )}
      </Box>
    </>
  )
}

export default Page
