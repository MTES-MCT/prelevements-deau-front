import {Typography} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import RegleCreationForm from '@/components/form/regle-creation-form.js'
import {
  getDeclarantAction,
  getExploitationFromPreleveurAction,
  getDocumentsFromPreleveurAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantAction(id)

  return buildPageTitle(['Nouvelle règle', result.success && result.data && displayPreleveur(result.data)], 'Nouvelle règle')
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
  const declarantId = getDeclarantId(declarant)

  const [exploitationsResult, documentsResult] = await Promise.all([
    getExploitationFromPreleveurAction(declarantId),
    getDocumentsFromPreleveurAction(declarantId)
  ])

  const exploitations = exploitationsResult.data || []
  const documents = documentsResult.data || []

  return (
    <div className='fr-container mt-4'>
      <Typography variant='h3' sx={{pb: 3}}>
        Création d&apos;une règle
      </Typography>

      <RegleCreationForm
        preleveur={declarant}
        exploitations={exploitations}
        documents={documents}
      />
    </div>
  )
}

export default Page
