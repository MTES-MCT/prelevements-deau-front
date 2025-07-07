import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Validateur = async ({children}) => (
  <>
    <StartDsfrOnHydration />
    {children}
  </>
)

export default Validateur
