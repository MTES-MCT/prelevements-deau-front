import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography, Box} from '@mui/material'
import Image from 'next/image'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Forbidden = () => (
  <>
    <StartDsfrOnHydration />

    <Box
      className='fr-container w-full gap-5'
      sx={{
        display: 'flex',
        flexDirection: {xs: 'column', md: 'row'},
        alignItems: {xs: 'center', md: 'flex-start'}
      }}
    >
      <Box className='fr-container w-full flex flex-col gap-5'>
        <Box className='fr-container w-full flex flex-col gap-2'>
          <Typography variant='h3' className='fr-mt-3w'>
            Accès interdit
          </Typography>
          <p>Erreur 403</p>
        </Box>

        <Box className='fr-container w-full flex flex-col gap-2'>
          <Typography variant='h6'>
            Vous n’avez pas les autorisations nécessaires pour accéder à cette page.
          </Typography>
          <p className='fr-text--sm fr-mb-5w'>
            Si vous pensez qu’il s’agit d’une erreur, contactez l’administrateur ou reconnectez-vous avec un compte disposant des droits requis.
          </p>

          <Button
            iconId='fr-icon-home-4-line'
            linkProps={{href: '/'}}
          >
            Retourner à la page d’accueil
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          minWidth: {xs: '100%', md: '300px'},
          display: 'flex',
          justifyContent: {xs: 'center', md: 'flex-start'}
        }}
      >
        <Image
          priority
          width={300}
          height={100}
          src='/images/assets/erreur-technique.svg'
          alt='Illustration accès interdit'
          style={{width: '100%', height: 'auto', maxWidth: 300}}
        />
      </Box>
    </Box>
  </>
)

export default Forbidden
