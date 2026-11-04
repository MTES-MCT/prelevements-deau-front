import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden, notFound} from 'next/navigation'

import CollectorContactDetailsForm from '@/components/form/collector-contact-details-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCollectorContactDetailsAction} from '@/server/actions/collector-points.js'

export const metadata = {title: 'Coordonnées du préleveur'}

export default async function Page({params}) {
  const {id} = await params
  const result = await getCollectorContactDetailsAction(id)
  if (result.code === 403) forbidden()
  if (result.code === 404) notFound()
  return <div className='fr-container mt-5'>
    <StartDsfrOnHydration />
    {result.success ? <CollectorContactDetailsForm form={result.data} />
      : <Alert severity='error' title='Les coordonnées ne peuvent pas être chargées.' description='Rechargez la page pour réessayer.' />}
  </div>
}
