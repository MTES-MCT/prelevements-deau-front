import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarantsURL} from '@/lib/urls.js'
import {getDeclarantOverviewAction} from '@/server/actions/index.js'

const DeclarantsLayout = async ({params, children}) => {
  const {id} = await params

  const declarantResult = await getDeclarantOverviewAction(id)

  if (!declarantResult.success || !declarantResult.data) {
    notFound()
  }

  const declarant = declarantResult.data

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>
        <Breadcrumb
          currentPageLabel={getDeclarantTitleFromDeclarant(declarant)}
          segments={[{
            label: 'Déclarants',
            linkProps: {
              href: getDeclarantsURL()
            }
          }]}
        />
        {children}
      </div>
    </>
  )
}

export default DeclarantsLayout
