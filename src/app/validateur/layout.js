import {Notice} from '@codegouvfr/react-dsfr/Notice'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Validateur = async ({children}) => (
  <>
    <StartDsfrOnHydration />
    <Notice
      className='mb-4'
      severity='info'
      title='Cet outil est en cours de développement.'
      description='Merci de nous signaler toute erreur non détectée ou injustifiée.'
    />
    {children}
  </>
)

export default Validateur
