import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementURL} from '@/lib/urls.js'
import {getPointPrelevementAction} from '@/server/actions/points-prelevement.js'
import {getPointPrelevementLabel} from '@/utils/point-prelevement.js'

const Layout = async ({params, children}) => {
  const {id} = await params

  const result = await getPointPrelevementAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const pointPrelevement = result.data

  const pointLabel = getPointPrelevementLabel({pointPrelevement})

  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container mt-4'>

        <Breadcrumb
          currentPageLabel={pointLabel}
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
