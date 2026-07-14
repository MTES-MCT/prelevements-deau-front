import {Box} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarantsList from '@/components/zones/zone-declarants-list.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {readListOptions, unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneCollecteursAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Collecteurs', result.success && result.data?.name], 'Collecteurs de la zone')
}

export const dynamic = 'force-dynamic'

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const listOptions = readListOptions(await searchParams)

  const [zoneResult, collecteursResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneCollecteursAction(zoneId, listOptions)
  ])

  if (!zoneResult.success || !zoneResult.data || !collecteursResult.success) {
    notFound()
  }

  const collecteursPayload = unwrapPaginatedData(collecteursResult.data)
  const zone = zoneResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Collecteurs' />
        <ZoneHeader zone={zone} currentSection='collecteurs' />
        <ZoneSubNavigation zone={zone} current='collecteurs' />
        <ZoneDeclarantsList collecteursOnly declarants={collecteursPayload.data} meta={collecteursPayload.meta} zone={zone} />
      </Box>
    </>
  )
}

export default Page
