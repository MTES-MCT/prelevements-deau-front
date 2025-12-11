'use client'
import React, {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import SelfTraining from '@codegouvfr/react-dsfr/picto/SelfTraining'
import {Typography, Box} from '@mui/material'

import Pictogram from '@/components/ui/Pictogram/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {requestMagicLinkAction} from '@/server/actions/auth.js'

const LoginPage = ({searchParams}) => {
  const params = React.use(searchParams)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = event => {
    const {value} = event.target
    setEmail(value)
    setError(null)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const data = await requestMagicLinkAction(email)

      if (data.success) {
        setIsEmailSent(true)
      } else {
        setError(data.message || 'Une erreur est survenue')
      }
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setIsLoading(false)
    }
  }

  // Get error message from URL params
  const getErrorMessage = () => {
    if (params.error === 'session_expired') {
      return 'Votre session a expiré. Veuillez vous reconnecter.'
    }

    if (params.error === 'CredentialsSignin') {
      return 'Le lien de connexion est invalide ou a expiré.'
    }

    if (params.error === 'invalid_session') {
      return 'Session invalide. Veuillez vous reconnecter.'
    }

    return null
  }

  const urlError = getErrorMessage()

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='h-full flex align-center p-4'>
        <Box className='flex w-full justify-center items-center'>
          <Box className='p-4 w-fit h-fit border border-[var(--artwork-motif-grey)]'>
            <Box className='flex flex-col items-center gap-4'>
              <Pictogram pictogram={SelfTraining} />
              <Typography variant='h4' component='h2' sx={{fontWeight: 500}}>
                Connexion à l&apos;espace instructeur
              </Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                {isEmailSent ? (
                  <Alert
                    severity='success'
                    title='Email envoyé'
                    description={
                      <>
                        {'Si ce compte existe et dispose des droits nécessaires, un email de connexion a été envoyé à '}<strong>{email}</strong>.
                        <br /><br />
                        Vérifiez votre boîte de réception et cliquez sur le lien correspondant à votre territoire pour vous connecter.
                      </>
                    }
                  />
                ) : (
                  <form className='space-y-3' onSubmit={handleSubmit}>
                    <div className='mt-2'>
                      <Input
                        label='Adresse email'
                        nativeInputProps={{
                          type: 'email',
                          name: 'email',
                          id: 'email',
                          autoComplete: 'email',
                          required: true,
                          value: email,
                          onChange: handleChange,
                          placeholder: 'votre.email@example.com'
                        }}
                        state={error ? 'error' : 'default'}
                        stateRelatedMessage={error}
                      />
                    </div>

                    <Button
                      type='submit'
                      disabled={email.length === 0 || isLoading}
                      className='w-full justify-center'
                    >
                      {isLoading ? 'Envoi en cours…' : 'Recevoir un lien de connexion'}
                    </Button>

                    {urlError && (
                      <Alert
                        small
                        description={urlError}
                        severity='warning'
                      />
                    )}

                    <Typography variant='body2' className='text-center mt-4 text-gray-600'>
                      Un email contenant un lien de connexion vous sera envoyé.
                    </Typography>
                  </form>
                )}
              </div>
            </div>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default LoginPage
