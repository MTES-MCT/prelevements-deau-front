import {Typography} from '@mui/material'
import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import RegleEditionForm from '@/components/form/regle-edition-form.js'
import {
  getDeclarantAction,
  getRegleAction,
  getExploitationFromPreleveurAction,
  getDocumentsFromPreleveurAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantAction(id)

  return buildPageTitle(['Règle', result.success && result.data && displayPreleveur(result.data)], 'Règle du déclarant')
}

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
    <div className='fr-container mt-4'>
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
  )
}

export default Page
