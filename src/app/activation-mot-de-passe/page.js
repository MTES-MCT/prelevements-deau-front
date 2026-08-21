'use client'

import {useEffect, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

import {useAuth} from '@/contexts/auth-context.js'
import {useAuthMethods} from '@/contexts/auth-methods-context.js'
import {AUTH_METHODS, validateNewPassword} from '@/lib/auth-methods.js'
import {takePasswordActivationValueOnce} from '@/lib/password-activation.js'
import {activatePasswordAction} from '@/server/actions/password-auth.js'

const ActivationMotDePassePage = () => {
  const {login} = useAuth()
  const {available, methods} = useAuthMethods()
  const [activationToken, setActivationToken] = useState(null)
  const [fragmentRead, setFragmentRead] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const activationRead = useRef(false)
  const passwordEnabled = methods.includes(AUTH_METHODS.PASSWORD)

  useEffect(() => {
    let storage = null

    try {
      storage = window.sessionStorage
    } catch {
      // Storage may be disabled; the fragment was still scrubbed synchronously.
    }

    const token = takePasswordActivationValueOnce(storage, activationRead)

    if (token === undefined) {
      return
    }

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setActivationToken(token)
    setFragmentRead(true)
  }, [])

  const handleSubmit = async event => {
    event.preventDefault()
    const validationError = validateNewPassword(password, confirmation)

    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await activatePasswordAction({
        token: activationToken,
        password
      })

      setPassword('')
      setConfirmation('')

      if (!result.success) {
        setError(result.error)
        return
      }

      const loginResult = await login(result.data.token)

      if (!loginResult.success) {
        window.location.assign('/login')
        return
      }

      window.location.assign('/')
    } catch {
      setPassword('')
      setConfirmation('')
      setError('Le mot de passe n’a pas pu être activé. Veuillez demander un nouveau lien.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='fr-container fr-my-8w'>
      <div className='fr-grid-row fr-grid-row--center'>
        <div className='fr-col-12 fr-col-md-8 fr-col-lg-6'>
          <h1>Activer mon mot de passe</h1>

          {!available && (
            <Alert
              severity='error'
              title='Activation temporairement indisponible'
              description='La configuration de l’authentification n’a pas pu être chargée.'
            />
          )}

          {available && !passwordEnabled && (
            <Alert
              severity='error'
              title='Activation indisponible'
              description='La connexion par mot de passe n’est pas activée sur cet environnement.'
            />
          )}

          {available && passwordEnabled && fragmentRead && !activationToken && (
            <Alert
              severity='error'
              title='Lien invalide'
              description='Ce lien d’activation est incomplet. Demandez un nouveau lien à un administrateur.'
            />
          )}

          {available && passwordEnabled && activationToken && (
            <>
              <p className='fr-text--sm'>
                Ce lien personnel est utilisable une seule fois et reste valable pendant 72 heures.
              </p>

              {error && (
                <Alert
                  className='fr-mb-3w'
                  severity='error'
                  title='Activation impossible'
                  description={error}
                />
              )}

              <form onSubmit={handleSubmit}>
                <Input
                  label='Nouveau mot de passe'
                  hintText='Entre 15 et 128 caractères. Les espaces et caractères Unicode sont autorisés.'
                  nativeInputProps={{
                    type: 'password',
                    name: 'new-password',
                    id: 'activation-new-password',
                    autoComplete: 'new-password',
                    required: true,
                    disabled: isLoading,
                    value: password,
                    onChange(event) {
                      setPassword(event.target.value)
                      setError(null)
                    }
                  }}
                />

                <Input
                  label='Confirmer le mot de passe'
                  nativeInputProps={{
                    type: 'password',
                    name: 'new-password-confirmation',
                    id: 'activation-new-password-confirmation',
                    autoComplete: 'new-password',
                    required: true,
                    disabled: isLoading,
                    value: confirmation,
                    onChange(event) {
                      setConfirmation(event.target.value)
                      setError(null)
                    }
                  }}
                />

                <Button type='submit' disabled={isLoading || !password || !confirmation}>
                  {isLoading ? 'Activation en cours…' : 'Activer mon mot de passe'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivationMotDePassePage
