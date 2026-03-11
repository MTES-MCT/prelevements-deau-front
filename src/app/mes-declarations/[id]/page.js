import {notFound} from 'next/navigation'

import Loading from '@/app/mes-declarations/[id]/loading.js'
import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationHeader from '@/components/declarations/declaration-header.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationPeriodLabel, getPointsPrelevementIdsFromDeclaration} from '@/lib/declaration.js'
import {getDeclarationAction} from '@/server/actions/declarations.js'

const Page = async ({params}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data
  const source = declaration?.source
  const idPoints = getPointsPrelevementIdsFromDeclaration(declaration)
  const periodLabel = getDeclarationPeriodLabel(declaration)

  if (!source) {
    return <Loading />
  }

  return (
    <>
      <StartDsfrOnHydration />

      <DeclarationHeader
        numero={declaration.code}
        status={source.globalInstructionStatus}
        dateDepot={declaration.createdAt}
        periodLabel={periodLabel}
      />

      <DeclarationDetails
        declaration={declaration}
        idPoints={idPoints}
        source={source}
        isInstructor={false}
      />
    </>
  )
}

export default Page
