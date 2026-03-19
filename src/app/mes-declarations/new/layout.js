import {fr} from '@codegouvfr/react-dsfr'
import {Download} from '@codegouvfr/react-dsfr/Download'
import {Typography, Box} from '@mui/material'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationTemplateAEP, getDeclarationTemplateTableauSuivi} from '@/lib/urls.js'

const NouvelleDeclaration = async ({children}) => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container flex flex-col my-4 gap-10'>
      <Typography variant='h3'>
        Dépôt d’un fichier de déclaration de prélèvements
      </Typography>
      <p>
        Cet outil vous permet de soumettre vos fichiers de déclaration de prélèvements.
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
            href: getDeclarationTemplateAEP()
          }}
        />
        <Download
          details='XLSX – 7 ko'
          label='Télécharger le template « Tableau de suivi »'
          linkProps={{
            href: getDeclarationTemplateTableauSuivi()
          }}
        />
      </div>
    </Box>
  </>
)

export default NouvelleDeclaration
