import {Box} from '@mui/material'
import {notFound, redirect} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import ZoneDeclarantsList from '@/components/zones/zone-declarants-list.js'
import ZoneHeader from '@/components/zones/zone-header.js'
import ZoneSubNavigation from '@/components/zones/zone-sub-navigation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {readListOptions, unwrapPaginatedData} from '@/lib/zone-pagination.js'
import {
  getZoneAction,
  getZoneDeclarantsAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {zoneId} = await params
  const result = await getZoneAction(zoneId)

  return buildPageTitle(['Déclarants', result.success && result.data?.name], 'Déclarants de la zone')
}

export const dynamic = 'force-dynamic'

function appendSearchParam(params, key, value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item) {
        params.append(key, item)
      }
    }

    return
  }

  if (value) {
    params.set(key, value)
  }
}

function removeDeclarantRoleParams(searchParams = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'declarantRole' || key === 'role') {
      continue
    }

    appendSearchParam(params, key, value)
  }

  return params
}

function removeDeclarantRoleFilter(meta = {}) {
  const {declarantRole, role, ...filters} = meta.filters ?? {}

  return {
    ...meta,
    filters
  }
}

const Page = async ({params, searchParams}) => {
  const {zoneId} = await params
  const resolvedSearchParams = await searchParams

  if (resolvedSearchParams.declarantRole || resolvedSearchParams.role) {
    const cleanParams = removeDeclarantRoleParams(resolvedSearchParams)
    const cleanQuery = cleanParams.toString()

    redirect(`/zones/${zoneId}/declarants${cleanQuery ? `?${cleanQuery}` : ''}`)
  }

  const listOptions = {
    ...readListOptions(resolvedSearchParams),
    declarantRole: 'PRELEVEUR'
  }

  const [zoneResult, declarantsResult] = await Promise.all([
    getZoneAction(zoneId),
    getZoneDeclarantsAction(zoneId, listOptions)
  ])

  if (!zoneResult.success || !zoneResult.data || !declarantsResult.success) {
    notFound()
  }

  const declarantsPayload = unwrapPaginatedData(declarantsResult.data)
  const declarantsMeta = removeDeclarantRoleFilter(declarantsPayload.meta)
  const zone = zoneResult.data

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb zone={zone} currentPageLabel='Déclarants' />
        <ZoneHeader zone={zone} currentSection='declarants' />
        <ZoneSubNavigation zone={zone} current='declarants' />
        <ZoneDeclarantsList declarants={declarantsPayload.data} meta={declarantsMeta} zone={zone} />
      </Box>
    </>
  )
}

export default Page
