import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {notFound} from 'next/navigation'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationHeader from '@/components/declarations/declaration-header.js'
import DeclarationInfos from '@/components/declarations/declaration-infos.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getSourcePeriodLabel, getPointsPrelevementIdsFromDeclaration} from '@/lib/declaration.js'
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
  const periodLabel = getSourcePeriodLabel(source)

  if (!source) {
    return (
      <>
        <StartDsfrOnHydration />

        <DeclarationHeader
          numero={declaration.code}
          status='PROCESSING'
          dateDepot={declaration.createdAt}
          periodLabel={periodLabel}
        />

        <div className='fr-mt-4w fr-mb-6w'>
          <Alert
            severity='info'
            title='Traitement en cours'
            description='Les fichiers ont bien été déposés. La déclaration sera disponible dès la fin du traitement automatique.'
          />

          <DeclarationInfos
            numeroArreteAot={declaration.aotDecreeNumber}
            type={declaration.type}
            declarationType={declaration.declarationType}
            dataSourceType={declaration.dataSourceType ?? 'SPREADSHEET'}
            comment={declaration.comment}
            files={declaration.files}
          />
        </div>
      </>
    )
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
