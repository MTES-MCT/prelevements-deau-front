'use client'

import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

import {useAuth} from '@/contexts/auth-context.js'
import {useAuthMethods} from '@/contexts/auth-methods-context.js'
import {AUTH_METHODS, validateNewPassword} from '@/lib/auth-methods.js'
import {changePasswordAction} from '@/server/actions/password-auth.js'

const PasswordChangeSection = () => {
  const {login} = useAuth()
  const {available, methods} = useAuthMethods()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null)

  if (!available || !methods.includes(AUTH_METHODS.PASSWORD)) {
    return null
  }

  const handleSubmit = async event => {
    event.preventDefault()
    const validationError = validateNewPassword(newPassword, confirmation)

    if (validationError) {
      setMessage({severity: 'error', text: validationError})
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const result = await changePasswordAction({currentPassword, newPassword})

      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')

      if (!result.success) {
        setMessage({severity: 'error', text: result.error})
        return
      }

      const loginResult = await login(result.data.token)

      if (!loginResult.success) {
        window.location.assign('/login?error=session_expired')
        return
      }

      setMessage({severity: 'success', text: 'Votre mot de passe a été modifié et vos autres sessions ont été fermées.'})
    } catch {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setMessage({severity: 'error', text: 'Le mot de passe n’a pas pu être modifié.'})
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section aria-labelledby='password-change-title' className='flex flex-col gap-3'>
      <div>
        <h2 className='fr-h6 fr-mb-1v' id='password-change-title'>Mot de passe</h2>
        <p className='fr-text--sm fr-mb-0'>
          La modification ferme toutes vos autres sessions et conserve uniquement celle-ci.
        </p>
      </div>

      {message && (
        <Alert
          severity={message.severity}
          title={message.severity === 'success' ? 'Mot de passe modifié' : 'Modification impossible'}
          description={message.text}
        />
      )}

      <form className='max-w-xl' onSubmit={handleSubmit}>
        <Input
          label='Mot de passe actuel'
          nativeInputProps={{
            type: 'password',
            name: 'current-password',
            id: 'current-password',
            autoComplete: 'current-password',
            required: true,
            disabled: isLoading,
            value: currentPassword,
            onChange(event) {
              setCurrentPassword(event.target.value)
              setMessage(null)
            }
          }}
        />

        <Input
          label='Nouveau mot de passe'
          hintText='Entre 15 et 128 caractères. Les espaces et caractères Unicode sont autorisés.'
          nativeInputProps={{
            type: 'password',
            name: 'new-password',
            id: 'account-new-password',
            autoComplete: 'new-password',
            required: true,
            disabled: isLoading,
            value: newPassword,
            onChange(event) {
              setNewPassword(event.target.value)
              setMessage(null)
            }
          }}
        />

        <Input
          label='Confirmer le nouveau mot de passe'
          nativeInputProps={{
            type: 'password',
            name: 'new-password-confirmation',
            id: 'account-new-password-confirmation',
            autoComplete: 'new-password',
            required: true,
            disabled: isLoading,
            value: confirmation,
            onChange(event) {
              setConfirmation(event.target.value)
              setMessage(null)
            }
          }}
        />

        <Button
          type='submit'
          disabled={isLoading || !currentPassword || !newPassword || !confirmation}
        >
          {isLoading ? 'Modification en cours…' : 'Modifier mon mot de passe'}
        </Button>
      </form>
    </section>
  )
}

export default PasswordChangeSection
