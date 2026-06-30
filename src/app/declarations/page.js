import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import DeclarationTabs from '@/components/declarations/instruction/declaration-tabs.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const metadata = {
  title: 'Déclarations'
}

export const dynamic = 'force-dynamic'

const Declarations = async () => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container mt-4 pb-16'>
      <CallOut
        iconId='ri-information-line'
        title='Déclarations'
      >
        Consultez les déclarations déposées et suivez le rapprochement des points de prélèvement détectés
        dans les fichiers.
      </CallOut>

      <DeclarationTabs />

    </div>
  </>
)

export default Declarations
