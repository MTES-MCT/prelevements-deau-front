import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementURL} from '@/lib/urls.js'

const Layout = async ({params, children}) => {
  const {id} = await params

  const pointPrelevement = await getPointPrelevement(id)
  if (!pointPrelevement) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>

        <Breadcrumb
          currentPageLabel={`${id} - ${pointPrelevement.nom}`}
          segments={[{
            label: 'Points de prélèvement',
            linkProps: {
              href: getPointsPrelevementURL()
            }
          }]}
        />

        {children}
      </div>
    </>
  )
}

export default Layout
