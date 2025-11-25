import {Typography} from '@mui/material'
import nextDynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import {
  getPreleveur,
  getExploitationFromPreleveur,
  getDocumentsFromPreleveur
} from '@/app/api/points-prelevement.js'
import RegleCreationForm from '@/components/form/regle-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const DynamicBreadcrumb = nextDynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {id} = await params
  const preleveur = await getPreleveur(id)

  if (!preleveur) {
    notFound()
  }

  const exploitations = await getExploitationFromPreleveur(id)
  const documents = await getDocumentsFromPreleveur(id)

  // Enrich exploitations with point info for display
  const enrichedExploitations = exploitations.map(exploitation => ({
    ...exploitation,
    point: exploitation.point || {}
  }))

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
