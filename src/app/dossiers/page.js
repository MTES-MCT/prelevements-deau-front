import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import {getDossiers} from '@/app/api/dossiers.js'
import DossiersList from '@/components/declarations/dossiers-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Dossiers = async () => {
  let dossiers = []
  let error = null

  try {
    dossiers = await getDossiers()
  } catch (error_) {
    console.error('Erreur lors de la récupération des dossiers:', error_)
    error = 'Une erreur est survenue lors du chargement des dossiers. Veuillez réessayer plus tard.'
  }

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

        {error ? (
          <Alert
            closable
            description={error}
            severity='error'
            title='Erreur de chargement'
          />
        ) : (
          <DossiersList dossiers={dossiers} />
        )}
      </div>
    </>
  )
}

export default Dossiers
