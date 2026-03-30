import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
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

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>
        <Breadcrumb
          currentPageLabel={`Déclaration n°${code}`}
          segments={[{
            label: 'Déclarations',
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

export default SourceLayout
