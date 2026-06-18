import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const NouvelleDeclaration = async ({children}) => (
  <>
    <StartDsfrOnHydration />
    {children}
  </>
)

export default NouvelleDeclaration
