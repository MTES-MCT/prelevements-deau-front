import {notFound} from 'next/navigation'

import MyDeclarationDetail from '@/components/declarations/my-declaration-detail.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {isPointReconciliationRelevant} from '@/lib/declaration.js'
import {
  getAvailablePointsPrelevementsForDeclarationAction,
  getDeclarationAction
} from '@/server/actions/declarations.js'

const Page = async ({params}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data
  const shouldLoadAvailablePoints = isPointReconciliationRelevant(declaration, declaration.source)
  const availablePointsResult = shouldLoadAvailablePoints
    ? await getAvailablePointsPrelevementsForDeclarationAction(declaration.id)
    : null
  const availablePoints = availablePointsResult?.success ? availablePointsResult.data.data : []

  return (
    <>
      <StartDsfrOnHydration />
      <MyDeclarationDetail initialDeclaration={declaration} availablePoints={availablePoints} />
    </>
  )
}

export default Page
