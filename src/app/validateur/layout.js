import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Typography} from '@mui/material'

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

    <div className='fr-container flex flex-col my-4 gap-10'>
      <Typography variant='h3'>
        Validateur de fichier de déclaration de prélèvements
      </Typography>
      <p>
        Cet outil vous permet de valider la conformité de vos fichiers de déclaration de prélèvements avant de les soumettre sur Démarches Simplifiées.
      </p>

      {children}
    </div>
  </>
)

export default Validateur
