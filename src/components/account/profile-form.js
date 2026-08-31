'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import {useAuth} from '@/contexts/auth-context.js'
import {
  buildProfilePayload,
  createProfileForm,
  getProfileValidationErrors,
  isLegalPersonAccount,
  validateProfile
} from '@/lib/account-profile.js'
import {updateCurrentUserProfileAction} from '@/server/actions/user.js'

function getProfileActionError(result) {
  if (result?.code === 400) {
    return 'Certains champs ne respectent pas le format attendu. Vérifiez les indications affichées dans le formulaire.'
  }

  if (result?.code === 403) {
    return 'La modification de ce profil n’est pas disponible dans le contexte actuel.'
  }

  if (result?.code === 409) {
    return 'Le profil a changé ou n’est plus disponible. Rechargez la page avant de réessayer.'
  }

  return 'Vos informations n’ont pas pu être enregistrées.'
}

// Les variantes de formulaire sont volontairement regroupées pour partager les mêmes règles et retours accessibles.
// eslint-disable-next-line complexity
const ProfileForm = ({initialUser, role, disabled = false}) => {
  const router = useRouter()
  const {refreshUser} = useAuth()
  const [savedUser, setSavedUser] = useState(initialUser)
  const [form, setForm] = useState(() => createProfileForm(initialUser, role))
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDeclarant = role === 'DECLARANT'
  const hasContactDetails = isDeclarant || role === 'INSTRUCTOR'
  const isLegalPerson = isLegalPersonAccount(initialUser, role)
  const namesAreRequired = !isLegalPerson

  const updateField = (field, value) => {
    setForm(previous => ({...previous, [field]: value}))
    setFieldErrors(previous => ({...previous, [field]: undefined}))
    setMessage(null)
  }

  const inputState = field => fieldErrors[field] ? 'error' : 'default'

  const handleSubmit = async event => {
    event.preventDefault()

    if (disabled) {
      return
    }

    const clientErrors = validateProfile(form, savedUser, role)
    setFieldErrors(clientErrors)
    setMessage(null)

    if (Object.keys(clientErrors).length > 0) {
      setMessage({
        severity: 'error',
        title: 'Informations à corriger',
        description: 'Vérifiez les champs signalés avant d’enregistrer.'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updateCurrentUserProfileAction(
        buildProfilePayload(form, savedUser, role)
      )

      if (!result.success) {
        const apiErrors = getProfileValidationErrors(
          result.validationErrors ?? result.data?.validationErrors
        )
        setFieldErrors(apiErrors)
        setMessage({
          severity: 'error',
          title: 'Modification impossible',
          description: getProfileActionError(result)
        })
        return
      }

      const profile = result.data?.profile ?? result.data?.user ?? result.data
      const nextUser = {...savedUser, ...profile}
      setSavedUser(nextUser)
      setForm(createProfileForm(nextUser, role))
      setFieldErrors({})
      setMessage({
        severity: 'success',
        title: 'Informations enregistrées',
        description: 'Votre profil a bien été mis à jour.'
      })

      try {
        await refreshUser()
      } catch {
        // Le profil est enregistré ; le prochain chargement rafraîchira la session.
      }

      router.refresh()
    } catch {
      setMessage({
        severity: 'error',
        title: 'Modification impossible',
        description: 'Une erreur inattendue a empêché l’enregistrement.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form noValidate aria-busy={isSubmitting} className='flex max-w-3xl flex-col gap-6' onSubmit={handleSubmit}>
      {isLegalPerson && (
        <Input
          label='Nom de la structure *'
          state={inputState('socialReason')}
          stateRelatedMessage={fieldErrors.socialReason}
          nativeInputProps={{
            id: 'account-social-reason',
            name: 'socialReason',
            autoComplete: 'organization',
            required: true,
            maxLength: 200,
            disabled: disabled || isSubmitting,
            value: form.socialReason,
            onChange: event => updateField('socialReason', event.target.value)
          }}
        />
      )}

      <div className={isLegalPerson ? 'border-t border-gray-200 pt-5' : ''}>
        {isDeclarant && (
          <h3 className='fr-h6 fr-mb-2w'>
            {isLegalPerson ? 'Contact principal' : 'Identité'}
          </h3>
        )}

        <div className={`grid grid-cols-1 gap-4 ${isDeclarant ? 'md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]' : 'md:grid-cols-2'}`}>
          {isDeclarant && (
            <Select
              label={isLegalPerson ? 'Civilité du contact' : 'Civilité'}
              placeholder='Non renseignée'
              nativeSelectProps={{
                id: 'account-civility',
                name: 'civility',
                disabled: disabled || isSubmitting,
                value: form.civility,
                onChange: event => updateField('civility', event.target.value)
              }}
              state={inputState('civility')}
              stateRelatedMessage={fieldErrors.civility}
              options={[
                {value: 'MR', label: 'M.'},
                {value: 'MRS', label: 'Mme'}
              ]}
            />
          )}

          <Input
            label={`${isLegalPerson ? 'Prénom du contact' : 'Prénom'}${namesAreRequired ? ' *' : ''}`}
            state={inputState('firstName')}
            stateRelatedMessage={fieldErrors.firstName}
            nativeInputProps={{
              id: 'account-first-name',
              name: 'firstName',
              autoComplete: 'given-name',
              required: namesAreRequired,
              maxLength: 80,
              disabled: disabled || isSubmitting,
              value: form.firstName,
              onChange: event => updateField('firstName', event.target.value)
            }}
          />

          <Input
            label={`${isLegalPerson ? 'Nom du contact' : 'Nom'}${namesAreRequired ? ' *' : ''}`}
            state={inputState('lastName')}
            stateRelatedMessage={fieldErrors.lastName}
            nativeInputProps={{
              id: 'account-last-name',
              name: 'lastName',
              autoComplete: 'family-name',
              required: namesAreRequired,
              maxLength: 80,
              disabled: disabled || isSubmitting,
              value: form.lastName,
              onChange: event => updateField('lastName', event.target.value)
            }}
          />
        </div>
      </div>

      {hasContactDetails && (
        <div className='border-t border-gray-200 pt-5'>
          <h3 className='fr-h6 fr-mb-2w'>Coordonnées professionnelles</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Input
              label='Téléphone'
              state={inputState('phoneNumber')}
              stateRelatedMessage={fieldErrors.phoneNumber}
              nativeInputProps={{
                id: 'account-phone-number',
                name: 'phoneNumber',
                type: 'tel',
                autoComplete: 'tel-national',
                inputMode: 'numeric',
                maxLength: 10,
                disabled: disabled || isSubmitting,
                value: form.phoneNumber,
                onChange: event => updateField('phoneNumber', event.target.value)
              }}
            />

            <Input
              label='Poste ou service'
              state={inputState('jobTitle')}
              stateRelatedMessage={fieldErrors.jobTitle}
              nativeInputProps={{
                id: 'account-job-title',
                name: 'jobTitle',
                autoComplete: 'organization-title',
                maxLength: 200,
                disabled: disabled || isSubmitting,
                value: form.jobTitle,
                onChange: event => updateField('jobTitle', event.target.value)
              }}
            />
          </div>
        </div>
      )}

      {isDeclarant && (
        <div className='border-t border-gray-200 pt-5'>
          <h3 className='fr-h6 fr-mb-2w'>Adresse postale</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Input
              label='Adresse'
              state={inputState('addressLine1')}
              stateRelatedMessage={fieldErrors.addressLine1}
              nativeInputProps={{
                id: 'account-address-line-1',
                name: 'addressLine1',
                autoComplete: 'address-line1',
                maxLength: 200,
                disabled: disabled || isSubmitting,
                value: form.addressLine1,
                onChange: event => updateField('addressLine1', event.target.value)
              }}
            />
            <Input
              label='Complément d’adresse'
              state={inputState('addressLine2')}
              stateRelatedMessage={fieldErrors.addressLine2}
              nativeInputProps={{
                id: 'account-address-line-2',
                name: 'addressLine2',
                autoComplete: 'address-line2',
                maxLength: 200,
                disabled: disabled || isSubmitting,
                value: form.addressLine2,
                onChange: event => updateField('addressLine2', event.target.value)
              }}
            />
            <div className='grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-[10rem_9rem_minmax(0,1fr)]'>
              <Input
                label='Boîte postale'
                state={inputState('poBox')}
                stateRelatedMessage={fieldErrors.poBox}
                nativeInputProps={{
                  id: 'account-po-box',
                  name: 'poBox',
                  maxLength: 20,
                  disabled: disabled || isSubmitting,
                  value: form.poBox,
                  onChange: event => updateField('poBox', event.target.value)
                }}
              />
              <Input
                label='Code postal'
                state={inputState('postalCode')}
                stateRelatedMessage={fieldErrors.postalCode}
                nativeInputProps={{
                  id: 'account-postal-code',
                  name: 'postalCode',
                  autoComplete: 'postal-code',
                  inputMode: 'numeric',
                  maxLength: 5,
                  disabled: disabled || isSubmitting,
                  value: form.postalCode,
                  onChange: event => updateField('postalCode', event.target.value)
                }}
              />
              <Input
                label='Commune'
                state={inputState('city')}
                stateRelatedMessage={fieldErrors.city}
                nativeInputProps={{
                  id: 'account-city',
                  name: 'city',
                  autoComplete: 'address-level2',
                  maxLength: 100,
                  disabled: disabled || isSubmitting,
                  value: form.city,
                  onChange: event => updateField('city', event.target.value)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {message && (
        <div aria-live='polite'>
          <Alert
            severity={message.severity}
            title={message.title}
            description={message.description}
          />
        </div>
      )}

      <div className='flex justify-end border-t border-gray-200 pt-5'>
        <Button
          type='submit'
          disabled={disabled
            || isSubmitting
            || Object.keys(buildProfilePayload(form, savedUser, role)).length === 0}
        >
          {isSubmitting ? 'Enregistrement en cours…' : 'Enregistrer mes informations'}
        </Button>
      </div>
    </form>
  )
}

export default ProfileForm
