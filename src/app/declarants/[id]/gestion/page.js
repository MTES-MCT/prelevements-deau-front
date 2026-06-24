import {Typography} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarantManagementSection from '@/components/declarants/declarant-management-section.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarantAction,
  getDeclarantDeclarationTypesAction
} from '@/server/actions/index.js'
import {getCurrentUser} from '@/server/actions/user.js'

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
  const result = await getDeclarantAction(id)

  return buildPageTitle(['Gestion', result.success && result.data ? getDeclarantTitleFromDeclarant(result.data) : null], 'Gérer un déclarant')
}

const Page = async ({params}) => {
  const {id} = await params

  const declarantResult = await getDeclarantAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const declarantId = getDeclarantId(declarant)
  const currentUserResult = await getCurrentUser()
  const currentRole = currentUserResult?.data?.role
  const currentUser = currentUserResult?.data?.user
  const isImpersonating = currentUserResult?.data?.impersonation?.active
  const canManageDeclarationTypes = ['INSTRUCTOR', 'ADMIN'].includes(currentRole)
  const canManageWriteActions = Boolean(declarant.right?.canEdit)
  const canImpersonate = currentRole === 'ADMIN' && !isImpersonating && currentUser?.id !== declarantId

  if (!canImpersonate && !canManageDeclarationTypes && !canManageWriteActions) {
    notFound()
  }

  const declarationTypesResult = canManageDeclarationTypes
    ? await getDeclarantDeclarationTypesAction(declarantId)
    : {success: true, data: emptyDeclarationTypesPayload}
  const declarationTypesPayload = declarationTypesResult.success
    ? declarationTypesResult.data
    : emptyDeclarationTypesPayload

  return (
    <div className='fr-container mb-8'>
      <Typography component='h1' variant='h3' sx={{pb: 5}}>
        Gestion du déclarant
      </Typography>

      <DeclarantManagementSection
        canImpersonate={canImpersonate}
        canManageDeclarationTypes={canManageDeclarationTypes}
        canManageWriteActions={canManageWriteActions}
        declarant={declarant}
        declarantId={declarantId}
        declarationTypesPayload={declarationTypesPayload}
      />
    </div>
  )
}

export default Page
