'use client'

import React, {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import SelfTraining from '@codegouvfr/react-dsfr/picto/SelfTraining'
import {
  Box,
  Tab,
  Tabs,
  Typography
} from '@mui/material'

import Pictogram from '@/components/ui/Pictogram/index.js'
import {useAuth} from '@/contexts/auth-context.js'
import {useAuthMethods} from '@/contexts/auth-methods-context.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {AUTH_METHODS, getSafeCallbackUrl} from '@/lib/auth-methods.js'
import {requestMagicLinkAction} from '@/server/actions/auth.js'

const AUTH_METHOD_LABELS = Object.freeze({
  [AUTH_METHODS.PASSWORD]: 'Mot de passe',
  [AUTH_METHODS.MAGIC_LINK]: 'Lien de connexion par email'
})

const IMPLEMENTED_METHODS = new Set(Object.keys(AUTH_METHOD_LABELS))
const GENERIC_LOGIN_ERROR = 'Impossible de vous connecter avec les informations saisies.'

const MagicLinkForm = ({email, setEmail, urlError}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState(null)

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

  if (isEmailSent) {
    return (
      <Alert
        severity='success'
        title='Demande de connexion prise en compte'
        description={(
          <>
            Si <strong>{email}</strong> correspond à un compte autorisé, vous recevrez un email contenant un lien de connexion. Vérifiez votre boîte de réception ainsi que vos courriers indésirables.
          </>
        )}
      />
    )
  }

  return (
    <form className='space-y-3' onSubmit={handleSubmit}>
      <Input
        label='Adresse email'
        nativeInputProps={{
          type: 'email',
          name: 'email',
          id: 'magic-link-email',
          autoComplete: 'email',
          required: true,
          value: email,
          onChange(event) {
            setEmail(event.target.value)
            setError(null)
          },
          placeholder: 'votre.email@example.com'
        }}
        state={error ? 'error' : 'default'}
        stateRelatedMessage={error}
      />

      <Button
        type='submit'
        disabled={email.length === 0 || isLoading}
        className='w-full justify-center'
      >
        {isLoading ? 'Envoi en cours…' : 'Recevoir un lien de connexion'}
      </Button>

      {urlError && <Alert small description={urlError} severity='warning' />}

      <Typography variant='body2' className='text-center mt-4 text-gray-600'>
        Un email contenant un lien de connexion vous sera envoyé.
      </Typography>
    </form>
  )
}

const PasswordForm = ({email, setEmail, callbackUrl, urlError}) => {
  const {loginWithPassword} = useAuth()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async event => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await loginWithPassword(email, password)
      setPassword('')

      if (!result.success) {
        setError(GENERIC_LOGIN_ERROR)
        return
      }

      window.location.assign(callbackUrl)
    } catch {
      setPassword('')
      setError(GENERIC_LOGIN_ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className='space-y-3' onSubmit={handleSubmit}>
      <Input
        label='Adresse email'
        nativeInputProps={{
          type: 'email',
          name: 'email',
          id: 'password-email',
          autoComplete: 'username',
          required: true,
          value: email,
          onChange(event) {
            setEmail(event.target.value)
            setError(null)
          },
          placeholder: 'votre.email@example.com'
        }}
      />

      <Input
        label='Mot de passe'
        nativeInputProps={{
          type: 'password',
          name: 'password',
          id: 'password',
          autoComplete: 'current-password',
          required: true,
          value: password,
          onChange(event) {
            setPassword(event.target.value)
            setError(null)
          }
        }}
        state={error ? 'error' : 'default'}
        stateRelatedMessage={error}
      />

      <Button
        type='submit'
        disabled={!email || !password || isLoading}
        className='w-full justify-center'
      >
        {isLoading ? 'Connexion en cours…' : 'Se connecter'}
      </Button>

      {urlError && <Alert small description={urlError} severity='warning' />}
    </form>
  )
}

const LoginPage = ({searchParams}) => {
  const parameters = React.use(searchParams)
  const {available, methods} = useAuthMethods()
  const implementedMethods = useMemo(
    () => methods.filter(method => IMPLEMENTED_METHODS.has(method)),
    [methods]
  )
  const unsupportedMethods = useMemo(
    () => methods.filter(method => !IMPLEMENTED_METHODS.has(method)),
    [methods]
  )
  const [activeMethod, setActiveMethod] = useState(implementedMethods[0])
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!implementedMethods.includes(activeMethod)) {
      setActiveMethod(implementedMethods[0])
    }
  }, [activeMethod, implementedMethods])

  const urlError = (() => {
    if (parameters.error === 'session_expired') {
      return 'Votre session a expiré. Veuillez vous reconnecter.'
    }

    if (parameters.error === 'CredentialsSignin') {
      return GENERIC_LOGIN_ERROR
    }

    if (parameters.error === 'invalid_session') {
      return 'Session invalide. Veuillez vous reconnecter.'
    }

    return null
  })()

  const callbackUrl = getSafeCallbackUrl(parameters.callbackUrl)

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='h-full flex align-center p-4'>
        <Box className='flex w-full justify-center items-center'>
          <Box className='p-4 w-full max-w-xl h-fit border border-[var(--artwork-motif-grey)]'>
            <Box className='flex flex-col items-center gap-4'>
              <Pictogram pictogram={SelfTraining} />
              <Typography variant='h4' component='h1' sx={{fontWeight: 500}}>
                Connexion à Partageons l’Eau
              </Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              {!available && (
                <Alert
                  severity='error'
                  title='Connexion temporairement indisponible'
                  description='Les méthodes de connexion n’ont pas pu être chargées. Réessayez dans quelques instants.'
                />
              )}

              {available && unsupportedMethods.length > 0 && (
                <Alert
                  severity='warning'
                  title='Méthode de connexion indisponible'
                  description='Une méthode configurée n’est pas prise en charge par cette version de l’application.'
                  className='fr-mb-3w'
                />
              )}

              {available && implementedMethods.length > 0 && (
                <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                  {implementedMethods.length > 1 && (
                    <Tabs
                      aria-label='Méthode de connexion'
                      className='fr-mb-3w'
                      value={activeMethod}
                      variant='fullWidth'
                      onChange={(_event, method) => setActiveMethod(method)}
                    >
                      {implementedMethods.map(method => (
                        <Tab key={method} label={AUTH_METHOD_LABELS[method]} value={method} />
                      ))}
                    </Tabs>
                  )}

                  {activeMethod === AUTH_METHODS.PASSWORD && (
                    <PasswordForm
                      callbackUrl={callbackUrl}
                      email={email}
                      setEmail={setEmail}
                      urlError={urlError}
                    />
                  )}

                  {activeMethod === AUTH_METHODS.MAGIC_LINK && (
                    <MagicLinkForm email={email} setEmail={setEmail} urlError={urlError} />
                  )}
                </div>
              )}
            </div>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default LoginPage
