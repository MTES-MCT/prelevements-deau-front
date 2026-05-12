import {Typography} from '@mui/material'
import nextDynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import RegleCreationForm from '@/components/form/regle-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDeclarantAction,
  getExploitationFromPreleveurAction,
  getDocumentsFromPreleveurAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const DynamicBreadcrumb = nextDynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

export const dynamic = 'force-dynamic'

function getDeclarantId(declarant) {
  return declarant.userId || declarant.id
}

const Page = async ({params}) => {
  const {id} = await params
  const declarantResult = await getDeclarantAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const declarantId = getDeclarantId(declarant)

  const [exploitationsResult, documentsResult] = await Promise.all([
    getExploitationFromPreleveurAction(declarantId),
    getDocumentsFromPreleveurAction(declarantId)
  ])

  const exploitations = exploitationsResult.data || []
  const documents = documentsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container mt-4'>
        <DynamicBreadcrumb
          currentPageLabel="Création d'une règle"
          segments={[
            {
              label: 'Déclarants',
              linkProps: {
                href: '/declarants'
              }
            },
            {
              label: displayPreleveur(declarant),
              linkProps: {
                href: `/declarants/${declarantId}`
              }
            }
          ]}
        />

        <Typography variant='h3' sx={{pb: 3}}>
          Création d&apos;une règle
        </Typography>

        <RegleCreationForm
          preleveur={declarant}
          exploitations={exploitations}
          documents={documents}
        />
      </div>
    </>
  )
}

export default Page
