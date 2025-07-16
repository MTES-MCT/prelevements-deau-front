import {fr} from '@codegouvfr/react-dsfr'
import {Download} from '@codegouvfr/react-dsfr/Download'
import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Typography, Box} from '@mui/material'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Validateur = async ({children}) => (
  <>
    <StartDsfrOnHydration />
    <Notice
      className='mb-4'
      severity='info'
      title='Cet outil est en cours de développement.'
      description='Merci de nous signaler tout problème à l’adresse :'
      link={{
        linkProps: {
          href: 'mailto:prelevements-deau@beta.gouv.fr?subject=Retour%20d%27utilisation%20du%20validateur%20de%20déclaration'
        },
        text: 'prelevements-deau@beta.gouv.fr'
      }}
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
    <Box
      className='flex flex-wrap justify-between gap-4'
      sx={{
        pt: 3,
        pb: 2,
        backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
      }}
    >
      <div className='fr-container'>
        <h3 className='fr-h5'>
          Besoin du template de déclaration ?
        </h3>
        <Download
          details='XLSX – 318 ko'
          label='Télécharger le template « Données standardisées »'
          linkProps={{
            href: '/templates/donnees-standardisees.xlsx'
          }}
        />
        <Download
          details='XLSX – 7 ko'
          label='Télécharger le template « Tableau de suivi »'
          linkProps={{
            href: '/templates/tableau-de-suivi.xlsx'
          }}
        />
      </div>
    </Box>
  </>
)

export default Validateur
