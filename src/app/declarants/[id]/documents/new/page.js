import {Typography} from '@mui/material'
import nextDynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import DocumentUploadForm from '@/components/form/document-upload-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDeclarantAction,
  getExploitationFromPreleveurAction
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

  const exploitationsResult = await getExploitationFromPreleveurAction(declarantId)
  const exploitations = exploitationsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container'>
        <DynamicBreadcrumb
          currentPageLabel='Nouveau document'
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

        <Typography variant='h3' sx={{mb: 3}}>
          Ajouter un document
        </Typography>

        <DocumentUploadForm
          exploitations={exploitations}
          preleveur={declarant}
        />
      </div>
    </>
  )
}

export default Page
