import {Typography} from '@mui/material'
import nextDynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import RegleEditionForm from '@/components/form/regle-edition-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDeclarantAction,
  getRegleAction,
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
  const {id, regleId} = await params
  const declarantResult = await getDeclarantAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data
  const declarantId = getDeclarantId(declarant)

  const regleResult = await getRegleAction(regleId)

  if (!regleResult.success || !regleResult.data) {
    notFound()
  }

  const [exploitationsResult, documentsResult] = await Promise.all([
    getExploitationFromPreleveurAction(declarantId),
    getDocumentsFromPreleveurAction(declarantId)
  ])

  const regle = regleResult.data
  const exploitations = exploitationsResult.data || []
  const documents = documentsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container mt-4'>
        <DynamicBreadcrumb
          currentPageLabel='Édition de la règle'
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
          Édition de la règle
        </Typography>

        <RegleEditionForm
          preleveur={declarant}
          regle={regle}
          exploitations={exploitations}
          documents={documents}
        />
      </div>
    </>
  )
}

export default Page
