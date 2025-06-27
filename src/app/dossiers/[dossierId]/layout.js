import {notFound} from 'next/navigation'

import {getDossier} from '@/app/api/dossiers.js'
import DossiersBreadcrumb from '@/components/declarations/dossier/dossiers-breadcrumb.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {parseHttpError} from '@/lib/http-error.js'

const DossierPage = async ({params, children}) => {
  const {dossierId} = await params

  let dossier
  try {
    dossier = await getDossier(dossierId)
  } catch (error) {
    const {code} = parseHttpError(error)
    if (code === 404) {
      notFound()
    }
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

