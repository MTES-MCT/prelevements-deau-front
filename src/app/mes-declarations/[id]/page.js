import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import MyDeclarationDetail from '@/components/declarations/my-declaration-detail.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {isPointReconciliationRelevant} from '@/lib/declaration.js'
import {
  getAvailablePointsPrelevementsForDeclarationAction,
  getDeclarationAction
} from '@/server/actions/declarations.js'
import {getCurrentUser} from '@/server/actions/user.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarationAction(id)
  const declaration = result.success ? result.data?.data : null

  return buildPageTitle([declaration?.code && `Déclaration n°${declaration.code}`], 'Ma déclaration')
}

const Page = async ({params}) => {
  const {id} = await params

  const [result, userResult] = await Promise.all([
    getDeclarationAction(id),
    getCurrentUser()
  ])
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data
  const showDeclarant = userResult?.data?.declarantRole === 'COLLECTEUR'
  const shouldLoadAvailablePoints = declaration.source?.status === 'COMPLETED'
    && isPointReconciliationRelevant(declaration, declaration.source)
  const availablePointsResult = shouldLoadAvailablePoints
    ? await getAvailablePointsPrelevementsForDeclarationAction(declaration.id)
    : null
  const availablePoints = availablePointsResult?.success ? availablePointsResult.data.data : []

  return (
    <>
      <StartDsfrOnHydration />
      <MyDeclarationDetail
        initialDeclaration={declaration}
        availablePoints={availablePoints}
        showDeclarant={showDeclarant}
      />
    </>
  )
}

export default Page
