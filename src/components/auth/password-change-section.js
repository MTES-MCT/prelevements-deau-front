'use client'

import {useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

import {useAuth} from '@/contexts/auth-context.js'
import {useAuthMethods} from '@/contexts/auth-methods-context.js'
import {AUTH_METHODS, validateNewPassword} from '@/lib/auth-methods.js'
import {changePasswordAction} from '@/server/actions/password-auth.js'

const PasswordChangeSection = ({disabled = false}) => {
  const {login, user} = useAuth()
  const {available, methods} = useAuthMethods()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [fieldError, setFieldError] = useState(null)
  const currentPasswordInputRef = useRef(null)
  const newPasswordInputRef = useRef(null)
  const confirmationInputRef = useRef(null)
  const mutationDisabled = disabled || Boolean(user?.impersonation)

  const focusToggle = () => {
    window.requestAnimationFrame(() => document.querySelector('#account-password-toggle')?.focus())
  }

  const closeForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmation('')
    setMessage(null)
    setFieldError(null)
    setIsFormOpen(false)
    focusToggle()
  }

  const openForm = () => {
    setMessage(null)
    setFieldError(null)
    setIsFormOpen(true)
    window.requestAnimationFrame(() => currentPasswordInputRef.current?.focus())
  }

  const clearFieldError = field => {
    setFieldError(previous => previous?.field === field ? null : previous)
  }

  if (!available || !methods.includes(AUTH_METHODS.PASSWORD)) {
    return null
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (mutationDisabled) {
      return
    }

    const validationError = validateNewPassword(newPassword, confirmation)

    if (validationError) {
      const field = validationError === 'Les deux mots de passe ne correspondent pas.'
        ? 'confirmation'
        : 'newPassword'
      setFieldError({field, text: validationError})
      const input = field === 'confirmation'
        ? confirmationInputRef.current
        : newPasswordInputRef.current
      input?.focus()
      return
    }

    setIsLoading(true)
    setMessage(null)
    setFieldError(null)

    try {
      const result = await changePasswordAction({currentPassword, newPassword})

      if (!result.success) {
        setCurrentPassword('')
        setFieldError({
          field: 'currentPassword',
          text: result.error || 'Vérifiez votre mot de passe actuel.'
        })
        currentPasswordInputRef.current?.focus()
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')

      const loginResult = await login(result.data.token)

      if (!loginResult.success) {
        window.location.assign('/login?error=session_expired')
        return
      }

      setIsFormOpen(false)
      setMessage({severity: 'success', text: 'Vos autres sessions ont été fermées.'})
      focusToggle()
    } catch {
      setCurrentPassword('')
      setFieldError({
        field: 'currentPassword',
        text: 'Le mot de passe n’a pas pu être modifié. Réessayez.'
      })
      currentPasswordInputRef.current?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section
      aria-label='Mot de passe'
      className={isFormOpen || message ? 'w-full' : ''}
    >
      <div className='flex justify-end'>
        <Button
          id='account-password-toggle'
          type='button'
          iconId='fr-icon-lock-line'
          priority='tertiary no outline'
          size='small'
          disabled={mutationDisabled || isLoading}
          nativeButtonProps={{
            'aria-controls': isFormOpen ? 'account-password-change-form' : undefined,
            'aria-expanded': isFormOpen,
            'aria-label': isFormOpen
              ? 'Fermer le formulaire de modification du mot de passe'
              : 'Modifier mon mot de passe'
          }}
          onClick={isFormOpen ? closeForm : openForm}
        >
          {isFormOpen ? 'Fermer' : 'Modifier mon mot de passe'}
        </Button>
      </div>

      {message && (
        <div className='mt-4'>
          <Alert
            severity={message.severity}
            title={message.severity === 'success' ? 'Mot de passe modifié' : 'Modification impossible'}
            description={message.text}
          />
        </div>
      )}

      {isFormOpen && (
        <form
          id='account-password-change-form'
          className='mt-5 max-w-2xl border border-gray-200 bg-white p-4 md:p-5'
          onSubmit={handleSubmit}
        >
          <Input
            label='Mot de passe actuel'
            state={fieldError?.field === 'currentPassword' ? 'error' : 'default'}
            stateRelatedMessage={fieldError?.field === 'currentPassword' ? fieldError.text : undefined}
            nativeInputProps={{
              ref: currentPasswordInputRef,
              type: 'password',
              name: 'current-password',
              id: 'current-password',
              autoComplete: 'current-password',
              required: true,
              disabled: mutationDisabled || isLoading,
              value: currentPassword,
              onChange(event) {
                setCurrentPassword(event.target.value)
                clearFieldError('currentPassword')
                setMessage(null)
              }
            }}
          />

          <Input
            label='Nouveau mot de passe'
            hintText='Entre 15 et 128 caractères.'
            state={fieldError?.field === 'newPassword' ? 'error' : 'default'}
            stateRelatedMessage={fieldError?.field === 'newPassword' ? fieldError.text : undefined}
            nativeInputProps={{
              ref: newPasswordInputRef,
              type: 'password',
              name: 'new-password',
              id: 'account-new-password',
              autoComplete: 'new-password',
              required: true,
              disabled: mutationDisabled || isLoading,
              value: newPassword,
              onChange(event) {
                setNewPassword(event.target.value)
                clearFieldError('newPassword')
                setMessage(null)
              }
            }}
          />

          <Input
            label='Confirmer le nouveau mot de passe'
            state={fieldError?.field === 'confirmation' ? 'error' : 'default'}
            stateRelatedMessage={fieldError?.field === 'confirmation' ? fieldError.text : undefined}
            nativeInputProps={{
              ref: confirmationInputRef,
              type: 'password',
              name: 'new-password-confirmation',
              id: 'account-new-password-confirmation',
              autoComplete: 'new-password',
              required: true,
              disabled: mutationDisabled || isLoading,
              value: confirmation,
              onChange(event) {
                setConfirmation(event.target.value)
                clearFieldError('confirmation')
                setMessage(null)
              }
            }}
          />

          <p className='fr-text--xs fr-mb-0 text-gray-600'>
            Vos autres sessions seront fermées.
          </p>

          <div className='mt-4 flex flex-wrap gap-2'>
            <Button
              type='submit'
              disabled={mutationDisabled || isLoading || !currentPassword || !newPassword || !confirmation}
            >
              {isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              type='button'
              priority='tertiary no outline'
              disabled={mutationDisabled || isLoading}
              onClick={closeForm}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

export default PasswordChangeSection
