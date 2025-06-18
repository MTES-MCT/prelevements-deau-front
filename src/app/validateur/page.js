import FileValidateurForm from '@/components/declarations/validateur/form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Validateur = async () => (
  <>
    <StartDsfrOnHydration />
    <FileValidateurForm />
  </>
)

export default Validateur
