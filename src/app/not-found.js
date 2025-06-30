import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography, Box} from '@mui/material'
import Image from 'next/image'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const NotFound = () => (
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
            Page non trouvée
          </Typography>
          <p>Erreur 404</p>
        </Box>

        <Box className='fr-container w-full flex flex-col gap-2'>
          <Typography variant='h6'>
            La page que vous cherchez est introuvable. Excusez-nous pour la gêne occasionnée.
          </Typography>
          <p className='fr-text--sm fr-mb-5w'>
            Si vous avez tapé l’adresse web dans le navigateur, vérifiez qu’elle est correcte. La page n’est peut-être plus disponible.<br />
            Dans ce cas, pour continuer votre visite vous pouvez consulter notre page d’accueil, ou effectuer une recherche avec notre moteur de recherche en haut de page.<br />
            Sinon contactez-nous pour que l’on puisse vous rediriger vers la bonne information.
          </p>
          <Button
            iconId='fr-icon-home-4-line'
            linkProps={{
              href: '/'
            }}
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
          alt='Erreur technique'
          style={{width: '100%', height: 'auto', maxWidth: 300}}
        />
      </Box>
    </Box>
  </>
)

export default NotFound
