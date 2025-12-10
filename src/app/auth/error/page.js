'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import SelfTraining from '@codegouvfr/react-dsfr/picto/SelfTraining'
import {Typography, Box} from '@mui/material'
import {useSearchParams} from 'next/navigation'

import Pictogram from '@/components/ui/Pictogram/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

/* eslint-disable camelcase */
const ERROR_MESSAGES = {
  // Backend auth errors
  expired: 'Le lien de connexion a expiré. Veuillez demander un nouveau lien.',
  invalid_token: 'Le lien de connexion est invalide.',
  missing_token: 'Le lien de connexion est incomplet.',
  missing_territoire: 'Le territoire est manquant dans le lien de connexion.',
  user_not_found: 'Utilisateur introuvable. Contactez l\'administrateur.',
  invalid_territoire: 'Vous n\'avez pas accès à ce territoire.',
  territoire_not_found: 'Le territoire demandé n\'existe pas.',
  // Frontend/Middleware errors
  insufficient_permissions: 'Vous n\'avez pas les droits nécessaires pour accéder à cette page. Un rôle éditeur est requis.',
  session_expired: 'Votre session a expiré. Veuillez vous reconnecter.',
  default: 'Une erreur est survenue lors de la connexion.'
}
/* eslint-enable camelcase */

const AuthErrorPage = () => {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'default'

  const errorMessage = ERROR_MESSAGES[reason] || ERROR_MESSAGES.default
  const isPermissionError = reason === 'insufficient_permissions'

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='h-full flex align-center p-4'>
        <Box className='flex w-full justify-center items-center'>
          <Box className='p-4 w-fit h-fit border border-[var(--artwork-motif-grey)]'>
            <Box className='flex flex-col items-center gap-4'>
              <Pictogram pictogram={SelfTraining} />
              <Typography variant='h4' component='h2' sx={{fontWeight: 500}}>
                {isPermissionError ? 'Accès refusé' : 'Erreur de connexion'}
              </Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                <Box className='flex flex-col gap-4'>
                  <Alert
                    severity={isPermissionError ? 'warning' : 'error'}
                    title={isPermissionError ? 'Droits insuffisants' : 'Erreur'}
                    description={errorMessage}
                  />

                  {isPermissionError ? (
                    <Button
                      linkProps={{href: '/'}}
                      className='w-full justify-center'
                    >
                      {'Retourner à l’accueil'}
                    </Button>
                  ) : (
                    <Button
                      linkProps={{href: '/login'}}
                      className='w-full justify-center'
                    >
                      {'Retourner à la page de connexion'}
                    </Button>
                  )}
                </Box>
              </div>
            </div>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default AuthErrorPage
