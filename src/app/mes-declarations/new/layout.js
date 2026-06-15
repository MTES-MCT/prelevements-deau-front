import {fr} from '@codegouvfr/react-dsfr'
import {Typography, Box} from '@mui/material'

import DeclarationTemplateDownload from '@/components/declarations/declaration-template-download.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const NouvelleDeclaration = async ({children}) => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container flex flex-col my-3 gap-4'>
      <Typography variant='h4'>
        Nouvelle déclaration de prélèvements
      </Typography>
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
          Besoin du modèle type pour un dépôt de fichier ?
        </h3>
        <DeclarationTemplateDownload />
      </div>
    </Box>
  </>
)

export default NouvelleDeclaration
