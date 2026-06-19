import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getTelemetrySourceTitle} from '@/lib/declaration.js'
import {getMyDeclarationsURL} from '@/lib/urls.js'
import {getMyTelemetrySourceAction} from '@/server/actions/declarations.js'

const Layout = async ({params, children}) => {
  const {sourceId} = await params

  const result = await getMyTelemetrySourceAction(sourceId)
  if (!result.success || !result.data?.data) {
    notFound()
  }

  const source = result.data.data

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>
        <Breadcrumb
          currentPageLabel={getTelemetrySourceTitle(source)}
          segments={[{
            label: 'Mes déclarations',
            linkProps: {
              href: getMyDeclarationsURL()
            }
          }]}
        />

        {children}
      </div>
    </>
  )
}

export default Layout
