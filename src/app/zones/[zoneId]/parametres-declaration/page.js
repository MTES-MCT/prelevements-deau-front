import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarationSettings from '@/components/zones/zone-declaration-settings.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAction,
  getZoneDeclarationSettingsAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Paramètres de déclaration', result.success && result.data?.name], 'Paramètres de déclaration')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {zoneId} = await params
  const [zoneResult, settingsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarationSettingsAction(zoneId)
  ])

  if (!zoneResult.success || !zoneResult.data || !settingsResult.success || !settingsResult.data) {
    notFound()
  }

  const zone = zoneResult.data
  const settings = settingsResult.data.data || settingsResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Paramètres de déclaration' />
        <ZoneHeader zone={zone} currentSection='declaration-settings' />
        <ZoneSubNavigation zone={zone} current='declaration-settings' />
        <ZoneDeclarationSettings zone={zone} settings={settings} />
      </Box>
    </>
  )
}

export default Page
