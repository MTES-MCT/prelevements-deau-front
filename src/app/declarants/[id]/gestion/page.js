import {Typography} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarantManagementSection from '@/components/declarants/declarant-management-section.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarantOverviewAction,
  getDeclarantDeclarationTypesAction,
  getDeclarantZonesAction
} from '@/server/actions/index.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'
import {getZoneOptionsForPermissionAction} from '@/server/actions/zones.js'

const emptyDeclarationTypesPayload = {
  data: [],
  meta: {
    canManage: false,
    availableDeclarationTypes: []
  }
}

function getDeclarantId(declarant) {
  return declarant.userId || declarant.id
}

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantOverviewAction(id)

  return buildPageTitle(['Gestion', result.success && result.data ? getDeclarantTitleFromDeclarant(result.data) : null], 'Gérer un déclarant')
}

const Page = async ({params}) => {
  const {id} = await params

  const declarantResult = await getDeclarantOverviewAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const declarantId = getDeclarantId(declarant)
  const currentUserResult = await getCurrentSessionInfo()
  const currentRole = currentUserResult?.data?.role
  const currentUser = currentUserResult?.data?.user
  const isImpersonating = currentUserResult?.data?.impersonation?.active
  const permissions = new Set(declarant.right?.permissions || [])
  const canDelete = permissions.has('declarant.delete')
  const canInvite = permissions.has('declarant.invite')
  const canReadDeclarationTypes = permissions.has('declarant.declaration-type.read')
  const canManageZones = permissions.has('declarant.zone.update')
  const canImpersonate = currentRole === 'ADMIN' && !isImpersonating && currentUser?.id !== declarantId

  if (!canImpersonate && !canDelete && !canInvite && !canReadDeclarationTypes && !canManageZones) {
    notFound()
  }

  const declarationTypesResult = canReadDeclarationTypes
    ? await getDeclarantDeclarationTypesAction(declarantId)
    : {success: true, data: emptyDeclarationTypesPayload}
  const declarationTypesPayload = declarationTypesResult.success
    ? declarationTypesResult.data
    : emptyDeclarationTypesPayload
  const [declarantZonesResult, zoneOptionsResult] = canManageZones
    ? await Promise.all([
      getDeclarantZonesAction(declarantId),
      getZoneOptionsForPermissionAction('declarant.zone.update')
    ])
    : [{success: true, data: {items: []}}, {success: true, data: []}]

  return (
    <div className='fr-container mb-8'>
      <Typography component='h1' variant='h3' sx={{pb: 5}}>
        Gestion du déclarant
      </Typography>

      <DeclarantManagementSection
        canImpersonate={canImpersonate}
        canDelete={canDelete}
        canInvite={canInvite}
        canManageZones={canManageZones}
        canReadDeclarationTypes={canReadDeclarationTypes}
        declarant={declarant}
        declarantId={declarantId}
        declarationTypesPayload={declarationTypesPayload}
        zoneItems={declarantZonesResult.success ? declarantZonesResult.data?.items || [] : []}
        zoneOptions={zoneOptionsResult.success ? zoneOptionsResult.data || [] : []}
      />
    </div>
  )
}

export default Page
