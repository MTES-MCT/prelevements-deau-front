import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden} from 'next/navigation'

import PointCreationForm from '@/components/form/point-creation-form.js'
import CollectorPointCreationForm from '@/components/form/collector-point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {getCollectorPointCreationPreleveursAction, getMyCollectorPointManagementAction} from '@/server/actions/collector-points.js'
import {getPointsPrelevementOptionsAction} from '@/server/actions/points-prelevement.js'

export const metadata = {
  title: 'Nouveau point de prélèvement'
}

const Page = async ({searchParams}) => {
  const currentUserResult = await getCurrentUser()
  const isDeclarant = currentUserResult?.data?.role === 'DECLARANT'
  const management = isDeclarant ? await getMyCollectorPointManagementAction() : null
  if (!currentUserResult?.data?.permissions?.includes('pp.create') && !management?.data?.enabled) {
    forbidden()
  }

  const [preleveurs, points, query] = await Promise.all([
    management?.data?.enabled ? getCollectorPointCreationPreleveursAction() : null,
    management?.data?.enabled ? getPointsPrelevementOptionsAction() : null,
    searchParams
  ])

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container mt-4 mb-4 flex justify-end'>
        <Button
          priority='secondary'
          iconId='fr-icon-close-line'
          linkProps={{
            href: '/points-prelevement'
          }}
        >
          Annuler
        </Button>
      </div>

      {management?.data?.enabled
        ? preleveurs?.success && points?.success
          ? <CollectorPointCreationForm preleveurs={preleveurs.data} accessiblePoints={points.data}
            zones={management.data.zones} initialPreleveurId={typeof query?.preleveurId === 'string' ? query.preleveurId : ''} />
          : <div className='fr-container'><Alert severity='error' title='Le formulaire n’a pas pu être chargé.' description='Rechargez la page pour réessayer.' /></div>
        : <PointCreationForm />}
    </>
  )
}

export default Page
