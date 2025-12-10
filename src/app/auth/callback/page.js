'use client'

import {useEffect, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import SelfTraining from '@codegouvfr/react-dsfr/picto/SelfTraining'
import {Typography, Box, CircularProgress} from '@mui/material'
import {useRouter, useSearchParams} from 'next/navigation'

import Pictogram from '@/components/ui/Pictogram/index.js'
import {useAuth} from '@/contexts/auth-context.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const AuthCallbackPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {login} = useAuth()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const processToken = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      // Handle error from backend redirect
      if (error) {
        setStatus('error')
        /* eslint-disable camelcase */
        const errorMessages = {
          expired: 'Le lien de connexion a expiré. Veuillez demander un nouveau lien.',
          invalid_token: 'Le lien de connexion est invalide.',
          user_not_found: 'Utilisateur introuvable.',
          invalid_territoire: 'Vous n\'avez pas accès à ce territoire.',
          territoire_not_found: 'Le territoire demandé n’existe pas.',
          server_error: 'Erreur de communication avec le serveur. Veuillez réessayer.'
        }
        /* eslint-enable camelcase */
        setErrorMessage(errorMessages[error] || 'Une erreur est survenue lors de la connexion.')
        return
      }

      if (!token) {
        setStatus('error')
        setErrorMessage('Aucun token de session fourni.')
        return
      }

      try {
        const result = await login(token)

        if (result.success) {
          setStatus('success')
          // Redirect to home page after successful login
          setTimeout(() => {
            router.push('/')
          }, 1500)
        } else {
          setStatus('error')
          setErrorMessage('Le lien de connexion est invalide ou a expiré.')
        }
      } catch {
        setStatus('error')
        setErrorMessage('Une erreur est survenue lors de la connexion.')
      }
    }

    processToken()
  }, [searchParams, router, login])

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='h-full flex align-center p-4'>
        <Box className='flex w-full justify-center items-center'>
          <Box className='p-4 w-fit h-fit border border-[var(--artwork-motif-grey)]'>
            <Box className='flex flex-col items-center gap-4'>
              <Pictogram pictogram={SelfTraining} />
              <Typography variant='h4' component='h2' sx={{fontWeight: 500}}>
                Vérification de la connexion
              </Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                {status === 'loading' && (
                  <Box className='flex flex-col items-center gap-4'>
                    <CircularProgress />
                    <Typography>Connexion en cours...</Typography>
                  </Box>
                )}

                {status === 'success' && (
                  <Alert
                    severity='success'
                    title='Connexion réussie'
                    description={'Vous allez être redirigé vers la page d\'accueil...'}
                  />
                )}

                {status === 'error' && (
                  <Box className='flex flex-col gap-4'>
                    <Alert
                      severity='error'
                      title='Erreur de connexion'
                      description={errorMessage}
                    />
                    <Button
                      linkProps={{href: '/login'}}
                      className='w-full justify-center'
                    >
                      {'Retourner à la page de connexion'}
                    </Button>
                  </Box>
                )}
              </div>
            </div>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default AuthCallbackPage
