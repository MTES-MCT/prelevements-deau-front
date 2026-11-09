import Alert from '@codegouvfr/react-dsfr/Alert'
import Button from '@codegouvfr/react-dsfr/Button'

import PreleveurProfileSelector from '@/components/auth/preleveur-profile-selector.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPreleveurProfilesAction} from '@/server/actions/auth.js'

export const metadata = {title: 'Choisissez votre établissement'}
export const dynamic = 'force-dynamic'

export default async function ChoosePreleveurPage() {
  // The protected API checks the current email scope on every request.
  const result = await getPreleveurProfilesAction()

  return (
    <div className='fr-container fr-py-5w max-w-3xl'>
      <StartDsfrOnHydration />
      <h1>Choisissez votre établissement</h1>
      {result.success ? <PreleveurProfileSelector {...result.data} /> : (
        <>
          <Alert severity='error' title='Impossible de charger les établissements' description={result.error} />
          <Button className='fr-mt-3w' linkProps={{href: '/choisir-preleveur'}}>Réessayer</Button>
        </>
      )}
    </div>
  )
}
