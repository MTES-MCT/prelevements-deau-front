import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getTelemetrySourceTitle} from '@/lib/declaration.js'
import {getDeclarationsURL} from '@/lib/urls.js'
import {getMySourceAction} from '@/server/actions/sources.js'

const SourceLayout = async ({params, children}) => {
  const {sourceId} = await params
  const result = await getMySourceAction(sourceId)
  if (!result.success || !result.data) {
    notFound()
  }

  const source = result.data.data
  const code = source?.declaration?.code
  const title = code ? `Déclaration n°${code}` : getTelemetrySourceTitle(source)

  return (
    <>
      <StartDsfrOnHydration />
      <div className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-4 md:pt-6'>
          <Breadcrumb
            currentPageLabel={title}
            segments={[{
              label: 'Déclarations',
              linkProps: {
                href: getDeclarationsURL()
              }
            }]}
          />
          {children}
        </div>
      </div>
    </>
  )
}

export default SourceLayout
