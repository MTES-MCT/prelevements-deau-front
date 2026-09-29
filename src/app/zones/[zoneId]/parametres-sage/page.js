import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneResourceSettings from '@/components/zones/zone-resource-settings.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {canViewSageSettings} from '@/lib/zone-resource-settings.js'
import {getZoneAction, getZoneResourceSettingsAction} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)
  return buildPageTitle(['Paramètres du SAGE', result.success && result.data?.name], 'Paramètres du SAGE')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params
  const zoneResult = await getZoneAction(zoneId)
  if (!zoneResult.success || !canViewSageSettings(zoneResult.data)) notFound()

  const settingsResult = await getZoneResourceSettingsAction(zoneId)
  if (!settingsResult.success || !settingsResult.data?.data) notFound()

  const zone = zoneResult.data
  return (
    <>
      <StartDsfrOnHydration />
      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Paramètres du SAGE' />
        <ZoneHeader zone={zone} currentSection='sage-settings' />
        <ZoneSubNavigation zone={zone} current='sage-settings' />
        <ZoneResourceSettings
          zone={zone}
          settings={settingsResult.data.data}
          canEdit={settingsResult.data.canEdit === true}
        />
      </Box>
    </>
  )
}

export default Page
