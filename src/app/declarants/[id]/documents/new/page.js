import {Typography} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import DocumentUploadForm from '@/components/form/document-upload-form.js'
import {
  getDeclarantAction,
  getExploitationFromPreleveurAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantAction(id)

  return buildPageTitle(['Nouveau document', result.success && result.data && displayPreleveur(result.data)], 'Nouveau document')
}

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
  if (!declarant.right?.permissions?.includes('declarant.document.create')) {
    notFound()
  }

  const declarantId = getDeclarantId(declarant)

  const exploitationsResult = declarant.right.permissions.includes('exploitation.list')
    ? await getExploitationFromPreleveurAction(declarantId)
    : {data: []}
  const exploitations = exploitationsResult.data || []

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{mb: 3}}>
        Ajouter un document
      </Typography>

      <DocumentUploadForm
        exploitations={exploitations}
        preleveur={declarant}
      />
    </div>
  )
}

export default Page
