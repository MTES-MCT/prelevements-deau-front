import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationsURL} from '@/lib/urls.js'
import {getDeclarationAction} from "@/server/actions/declarations.js";

const Layout = async ({params, children}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>

        <Breadcrumb
          currentPageLabel={'Déclaration : #' + declaration.id}
          segments={[{
            label: 'Mes déclarations',
            linkProps: {
              href: getDeclarationsURL()
            }
          }]}
        />

        {children}
      </div>
    </>
  )
}

export default Layout
