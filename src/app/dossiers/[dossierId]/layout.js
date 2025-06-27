import {notFound} from 'next/navigation'

import {getDossier} from '@/app/api/dossiers.js'
import DossiersBreadcrumb from '@/components/declarations/dossier/dossiers-breadcrumb.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const DossierPage = async ({params, children}) => {
  const {dossierId} = await params
  const dossier = await getDossier(dossierId)
  if (!dossier) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>

        <DossiersBreadcrumb numero={dossier.number} />
        {children}
      </div>
    </>
  )
}

export default DossierPage

