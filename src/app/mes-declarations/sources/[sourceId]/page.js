import {notFound} from 'next/navigation'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildDeclarationViewFromSource,
  getSourcePeriodLabel
} from '@/lib/declaration.js'
import {getMyTelemetrySourceAction} from '@/server/actions/declarations.js'

const Page = async ({params}) => {
  const {sourceId} = await params

  const result = await getMyTelemetrySourceAction(sourceId)
  if (!result.success || !result.data?.data) {
    notFound()
  }

  const source = result.data.data
  const declaration = buildDeclarationViewFromSource(source)
  const periodLabel = getSourcePeriodLabel(source)

  return (
    <>
      <StartDsfrOnHydration />

      <DeclarationOverview
        declaration={declaration}
        status={source.globalInstructionStatus}
        periodLabel={periodLabel}
      />

      <DeclarationDetails
        isInstructor={false}
        declaration={declaration}
        source={source}
      />
    </>
  )
}

export default Page
