import {notFound} from 'next/navigation'

import DossiersBreadcrumb from '@/components/declarations/dossier/dossiers-breadcrumb.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDossierAction} from '@/server/actions/index.js'

const DossierPage = async ({params, children}) => {
  const {dossierId} = await params
  const result = await getDossierAction(dossierId)
  if (!result.success || !result.data) {
    notFound()
  }

  const dossier = result.data

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>

        <DossiersBreadcrumb numero={dossier.ds.dossierNumber} />
        {children}
      </div>
    </>
  )
}

export default DossierPage

