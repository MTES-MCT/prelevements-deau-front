import {Typography} from '@mui/material'
import nextDynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import RegleCreationForm from '@/components/form/regle-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getPreleveurAction,
  getExploitationFromPreleveurAction,
  getDocumentsFromPreleveurAction,
  getPointPrelevementAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const DynamicBreadcrumb = nextDynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {id} = await params
  const preleveurResult = await getPreleveurAction(id)

  if (!preleveurResult.success || !preleveurResult.data) {
    notFound()
  }

  const preleveur = preleveurResult.data

  const exploitationsResult = await getExploitationFromPreleveurAction(id)
  const exploitations = exploitationsResult.data || []
  const documentsResult = await getDocumentsFromPreleveurAction(id)
  const documents = documentsResult.data || []

  // Enrich exploitations with point details for display
  const enrichedExploitations = await Promise.all(
    exploitations.map(async exploitation => {
      const pointResult = await getPointPrelevementAction(exploitation.point)
      return {...exploitation, point: pointResult.success ? pointResult.data : null}
    })
  )

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container mt-4'>
        <DynamicBreadcrumb
          currentPageLabel="Création d'une règle"
          segments={[
            {
              label: 'Préleveurs',
              linkProps: {
                href: '/preleveurs'
              }
            },
            {
              label: displayPreleveur(preleveur),
              linkProps: {
                href: `/preleveurs/${preleveur.id_preleveur}`
              }
            }
          ]}
        />
        <Typography variant='h3' sx={{pb: 3}}>
          Création d&apos;une règle
        </Typography>
        <RegleCreationForm
          preleveur={preleveur}
          exploitations={enrichedExploitations}
          documents={documents || []}
        />
      </div>
    </>
  )
}

export default Page
