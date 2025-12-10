import {Typography} from '@mui/material'
import dynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import DocumentUploadForm from '@/components/form/document-upload-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getPreleveurAction,
  getExploitationFromPreleveurAction,
  getPointPrelevementAction
} from '@/server/actions/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

const Page = async ({params}) => {
  const {id} = await params
  const preleveur = await getPreleveurAction(id)

  if (!preleveur) {
    notFound()
  }

  const exploitations = await getExploitationFromPreleveurAction(id)

  // Fetch points for each exploitation to get their names
  const exploitationsWithPoints = await Promise.all(exploitations.map(async exploitation => {
    const point = await getPointPrelevementAction(exploitation.point)
    return {...exploitation, point}
  }))

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container'>
        <DynamicBreadcrumb
          currentPageLabel='Nouveau document'
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
        <Typography variant='h3' sx={{mb: 3}}>
          Ajouter un document
        </Typography>
        <DocumentUploadForm
          exploitations={exploitationsWithPoints}
          preleveur={preleveur}
        />
      </div>
    </>
  )
}

export default Page
