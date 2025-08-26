import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import {getDossiersStats} from '@/app/api/dossiers.js'
import DossiersTabs from '@/components/declarations/dossier/dossiers-tabs.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const dynamic = 'force-dynamic'

const Dossiers = async () => {
  const dossiersStats = await getDossiersStats()

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container mt-4'>
        <CallOut
          iconId='ri-information-line'
          title='Dossiers déposés'
        >
          Consultez, filtrez et triez les dossiers déposés par les préleveurs d’eau. Identifiez rapidement les erreurs éventuelles dans les données et accédez à leur détail pour un suivi précis.
        </CallOut>

        <DossiersTabs dossiersStats={dossiersStats} />

      </div>
    </>
  )
}

export default Dossiers
