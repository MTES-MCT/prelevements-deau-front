import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import DeclarationTabs from '@/components/declarations/instruction/declaration-tabs.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const dynamic = 'force-dynamic'

const Declarations = async () => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container mt-4'>
      <CallOut
        iconId='ri-information-line'
        title='Déclarations'
      >
        Consultez, filtrez et triez les déclarations déposées. Identifiez rapidement les erreurs éventuelles
        dans les données et accédez à leur détail pour un suivi précis.
      </CallOut>

      <DeclarationTabs />

    </div>
  </>
)

export default Declarations
