import {Typography} from '@mui/material'
import dynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import {getDocumentsFromPreleveur, getPreleveur} from '@/app/api/points-prelevement.js'
import DocumentUploadForm from '@/components/form/document-upload-form.js'
import DocumentsListForm from '@/components/form/documents-list-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

const Page = async ({params}) => {
  const {id} = await params
  const preleveur = await getPreleveur(id)
  const documents = await getDocumentsFromPreleveur(id)

  if (!preleveur) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container'>
        <DynamicBreadcrumb
          currentPageLabel='Gestion des documents'
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
        <Typography variant='h3'>
          Gestion des documents
        </Typography>
        <DocumentsListForm documents={documents} idPreleveur={preleveur.id_preleveur} />
        <DocumentUploadForm idPreleveur={preleveur.id_preleveur} />
      </div>
    </>
  )
}

export default Page
