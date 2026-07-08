import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildDeclarationViewFromSource,
  getSourcePeriodLabel
} from '@/lib/declaration.js'
import {getMyTelemetrySourceAction} from '@/server/actions/declarations.js'

export async function generateMetadata({params}) {
  const {sourceId} = await params
  const result = await getMyTelemetrySourceAction(sourceId)
  const source = result.success ? result.data?.data : null
  const declaration = source ? buildDeclarationViewFromSource(source) : null

  return buildPageTitle([
    declaration?.title,
    source && getSourcePeriodLabel(source)
  ], 'Données télérelevées')
}

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
        source={source}
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
