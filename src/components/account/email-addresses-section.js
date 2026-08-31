'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

import {
  EMAIL_VERIFICATION_PURPOSES,
  canCancelVerification,
  canResendVerification,
  extractEmailVerification,
  getNextVerificationRefreshDelay,
  getResendDelaySeconds,
  getVerificationPresentation,
  isValidEmail,
  normalizeEmail,
  shouldDisplayEmailVerification,
  upsertEmailVerification
} from '@/lib/email-verification.js'
import {
  cancelEmailVerificationAction,
  createCurrentUserEmailAliasAction,
  deleteCurrentUserEmailAliasAction,
  requestPrimaryEmailChangeAction,
  resendEmailVerificationAction
} from '@/server/actions/user.js'

function getActionError(result, fallback) {
  if (result?.code === 400) {
    return 'Cette adresse ne respecte pas le format attendu.'
  }

  if (result?.code === 409) {
    return 'Cette adresse est déjà utilisée ou réservée par un autre compte.'
  }

  if (result?.code === 429) {
    return 'Trop de tentatives ont été effectuées. Patientez quelques minutes avant de réessayer.'
  }

  if (result?.code === 403) {
    return 'Cette modification n’est pas disponible dans le contexte actuel.'
  }

  return result?.error || fallback
}

function focusControl(id) {
  window.requestAnimationFrame(() => document.querySelector(`#${id}`)?.focus())
}

const VerificationCard = ({
  disabled,
  now,
  operation,
  verification,
  onCancel,
  onResend
}) => {
  const presentation = getVerificationPresentation(verification, now)
  const resendDelay = getResendDelaySeconds(verification, now)
  const canCancel = canCancelVerification(verification, now)
  const canResend = canResendVerification(verification, now)
  const isBusy = operation === `verification:${verification.id}`

  return (
    <div className='border border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-3 md:p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <strong className='break-all'>{verification.email}</strong>
        <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${presentation.badgeClassName}`}>
          {presentation.label}
        </span>
      </div>

      <p className='fr-text--xs fr-mt-1w fr-mb-0 text-gray-700'>{presentation.description}</p>

      {(canResend || canCancel) && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {canResend && (
            <Button
              size='small'
              priority='secondary'
              disabled={disabled || isBusy || resendDelay > 0}
              nativeButtonProps={{'aria-label': `Renvoyer le lien à ${verification.email}`}}
              onClick={() => onResend(verification)}
            >
              {resendDelay > 0 ? `Renvoyer dans ${resendDelay} s` : 'Renvoyer'}
            </Button>
          )}
          {canCancel && (
            <Button
              size='small'
              priority='tertiary no outline'
              disabled={disabled || isBusy}
              nativeButtonProps={{'aria-label': `Annuler la demande pour ${verification.email}`}}
              onClick={() => onCancel(verification)}
            >
              Annuler
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

const EmailAddressesSection = ({
  disabled = false,
  initialAliases = [],
  initialNow,
  initialVerifications = [],
  primaryEmail
}) => {
  const router = useRouter()
  const [aliases, setAliases] = useState(initialAliases)
  const [verifications, setVerifications] = useState(initialVerifications)
  const [primaryCandidate, setPrimaryCandidate] = useState('')
  const [aliasCandidate, setAliasCandidate] = useState('')
  const [isPrimaryFormOpen, setIsPrimaryFormOpen] = useState(!primaryEmail)
  const [isAliasFormOpen, setIsAliasFormOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [operation, setOperation] = useState(null)
  const [now, setNow] = useState(initialNow)
  const primaryInputRef = useRef(null)
  const aliasInputRef = useRef(null)
  const messageRef = useRef(null)
  const operationLock = useRef(false)

  useEffect(() => {
    const refreshDelay = getNextVerificationRefreshDelay(verifications, now)

    if (refreshDelay === null) {
      return undefined
    }

    const timeout = window.setTimeout(() => setNow(Date.now()), refreshDelay)
    return () => window.clearTimeout(timeout)
  }, [now, verifications])

  useEffect(() => {
    if (message) {
      window.requestAnimationFrame(() => messageRef.current?.scrollIntoView({block: 'nearest'}))
    }
  }, [message])

  const normalizedPrimaryEmail = normalizeEmail(primaryEmail)
  const normalizedAliases = useMemo(
    () => new Set(aliases.map(alias => normalizeEmail(alias.email))),
    [aliases]
  )
  const primaryVerification = useMemo(
    () => verifications.find(item => (
      item.purpose === EMAIL_VERIFICATION_PURPOSES.primary
        && shouldDisplayEmailVerification(item)
    )),
    [verifications]
  )
  const aliasVerification = useMemo(
    () => verifications.find(item => (
      item.purpose === EMAIL_VERIFICATION_PURPOSES.alias
        && shouldDisplayEmailVerification(item)
    )),
    [verifications]
  )

  const startOperation = value => {
    if (operationLock.current) {
      return false
    }

    operationLock.current = true
    setOperation(value)
    setMessage(null)
    return true
  }

  const finishOperation = () => {
    operationLock.current = false
    setOperation(null)
  }

  const finishVerificationMutation = (result, successDescription) => {
    if (!result.success) {
      setMessage({
        severity: 'error',
        title: 'Demande impossible',
        description: getActionError(result, 'La demande n’a pas pu être enregistrée.')
      })
      return false
    }

    const verification = extractEmailVerification(result.data)
    if (verification) {
      setVerifications(previous => upsertEmailVerification(previous, verification))
    }

    if (verification?.status === 'SEND_FAILED') {
      setMessage({
        severity: 'warning',
        title: 'Message non envoyé',
        description: 'L’e-mail n’a pas pu être envoyé. Vous pouvez réessayer.'
      })
    } else if (verification && verification.status !== 'PENDING') {
      const presentation = getVerificationPresentation(verification)
      setMessage({
        severity: verification.status === 'CONFLICT' ? 'error' : 'warning',
        title: presentation.label,
        description: presentation.description
      })
    } else {
      setMessage({
        severity: 'success',
        title: 'Lien envoyé',
        description: successDescription
      })
    }

    router.refresh()
    return true
  }

  const handlePrimaryRequest = async event => {
    event.preventDefault()
    const email = normalizeEmail(primaryCandidate)

    setFieldErrors(previous => ({...previous, primary: undefined}))
    setMessage(null)

    if (!isValidEmail(email)) {
      setFieldErrors(previous => ({...previous, primary: 'Saisissez une adresse e-mail valide.'}))
      primaryInputRef.current?.focus()
      return
    }

    if (email === normalizedPrimaryEmail) {
      setFieldErrors(previous => ({...previous, primary: 'Cette adresse est déjà votre adresse principale.'}))
      primaryInputRef.current?.focus()
      return
    }

    if (disabled) {
      return
    }

    if (!startOperation('primary-request')) {
      return
    }

    try {
      const result = await requestPrimaryEmailChangeAction(email)
      if (finishVerificationMutation(
        result,
        primaryEmail
          ? 'Votre adresse actuelle reste active jusqu’à la validation.'
          : 'Cette adresse sera active après validation.'
      )) {
        setPrimaryCandidate('')
        setIsPrimaryFormOpen(false)
        focusControl('account-primary-email-toggle')
      } else if ([400, 409].includes(result.code)) {
        setFieldErrors(previous => ({
          ...previous,
          primary: getActionError(result, 'Cette adresse ne peut pas être utilisée.')
        }))
      }
    } catch {
      setMessage({
        severity: 'error',
        title: 'Demande impossible',
        description: 'Une erreur inattendue a empêché la demande de changement.'
      })
    } finally {
      finishOperation()
    }
  }

  const handleAliasRequest = async event => {
    event.preventDefault()
    const email = normalizeEmail(aliasCandidate)

    setFieldErrors(previous => ({...previous, alias: undefined}))
    setMessage(null)

    if (!isValidEmail(email)) {
      setFieldErrors(previous => ({...previous, alias: 'Saisissez une adresse e-mail valide.'}))
      aliasInputRef.current?.focus()
      return
    }

    if (email === normalizedPrimaryEmail) {
      setFieldErrors(previous => ({...previous, alias: 'Cette adresse est déjà votre adresse principale.'}))
      aliasInputRef.current?.focus()
      return
    }

    if (normalizedAliases.has(email)) {
      setFieldErrors(previous => ({...previous, alias: 'Cette adresse permet déjà de vous connecter.'}))
      aliasInputRef.current?.focus()
      return
    }

    if (disabled) {
      return
    }

    if (!startOperation('alias-request')) {
      return
    }

    try {
      const result = await createCurrentUserEmailAliasAction(email)
      if (finishVerificationMutation(
        result,
        'Vous pourrez utiliser cette adresse après validation.'
      )) {
        setAliasCandidate('')
        setIsAliasFormOpen(false)
        focusControl('account-alias-email-toggle')
      } else if ([400, 409].includes(result.code)) {
        setFieldErrors(previous => ({
          ...previous,
          alias: getActionError(result, 'Cette adresse ne peut pas être utilisée.')
        }))
      }
    } catch {
      setMessage({
        severity: 'error',
        title: 'Ajout impossible',
        description: 'Une erreur inattendue a empêché l’ajout de l’adresse.'
      })
    } finally {
      finishOperation()
    }
  }

  const handleResend = async verification => {
    if (!startOperation(`verification:${verification.id}`)) {
      return
    }

    try {
      const result = await resendEmailVerificationAction(verification.id)
      finishVerificationMutation(result, 'Un nouveau lien a été envoyé.')
    } catch {
      setMessage({
        severity: 'error',
        title: 'Renvoi impossible',
        description: 'Le message de validation n’a pas pu être renvoyé.'
      })
    } finally {
      finishOperation()
    }
  }

  const handleCancel = async verification => {
    if (!startOperation(`verification:${verification.id}`)) {
      return
    }

    try {
      const result = await cancelEmailVerificationAction(verification.id)

      if (!result.success) {
        setMessage({
          severity: 'error',
          title: 'Annulation impossible',
          description: getActionError(result, 'La demande n’a pas pu être annulée.')
        })
        return
      }

      const updatedVerification = extractEmailVerification(result.data) ?? {
        ...verification,
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString()
      }
      setVerifications(previous => upsertEmailVerification(previous, updatedVerification))
      const presentation = getVerificationPresentation(updatedVerification)
      setMessage(updatedVerification.status === 'CANCELLED'
        ? {
          severity: 'success',
          title: 'Demande annulée',
          description: 'Aucun changement n’a été appliqué.'
        }
        : {
          severity: 'warning',
          title: presentation.label,
          description: presentation.description
        })
      router.refresh()
      focusControl(verification.purpose === EMAIL_VERIFICATION_PURPOSES.primary
        ? 'account-primary-email-toggle'
        : 'account-alias-email-toggle')
    } catch {
      setMessage({
        severity: 'error',
        title: 'Annulation impossible',
        description: 'Une erreur inattendue a empêché l’annulation.'
      })
    } finally {
      finishOperation()
    }
  }

  const handleAliasDelete = async alias => {
    if (disabled) {
      return
    }

    // eslint-disable-next-line no-alert
    const confirmed = globalThis.confirm(
      `Supprimer l’adresse « ${alias.email} » ?\n\nElle ne permettra plus de se connecter à ce compte.`
    )

    if (!confirmed) {
      return
    }

    if (!startOperation(`alias:${alias.id}`)) {
      return
    }

    try {
      const result = await deleteCurrentUserEmailAliasAction(alias.id)

      if (!result.success) {
        setMessage({
          severity: 'error',
          title: 'Suppression impossible',
          description: getActionError(result, 'Cette adresse n’a pas pu être supprimée.')
        })
        return
      }

      setAliases(previous => previous.filter(item => item.id !== alias.id))
      setMessage({
        severity: 'success',
        title: 'Adresse supprimée',
        description: alias.email
      })
      router.refresh()
      focusControl('account-alias-email-toggle')
    } catch {
      setMessage({
        severity: 'error',
        title: 'Suppression impossible',
        description: 'Une erreur inattendue a empêché la suppression.'
      })
    } finally {
      finishOperation()
    }
  }

  const togglePrimaryForm = () => {
    setIsPrimaryFormOpen(value => {
      if (!value) {
        window.requestAnimationFrame(() => primaryInputRef.current?.focus())
      }

      return !value
    })
    setFieldErrors(previous => ({...previous, primary: undefined}))
    setMessage(null)
  }

  const closePrimaryForm = () => {
    setIsPrimaryFormOpen(false)
    setPrimaryCandidate('')
    setFieldErrors(previous => ({...previous, primary: undefined}))
    focusControl('account-primary-email-toggle')
  }

  const toggleAliasForm = () => {
    setIsAliasFormOpen(value => {
      if (!value) {
        window.requestAnimationFrame(() => aliasInputRef.current?.focus())
      }

      return !value
    })
    setFieldErrors(previous => ({...previous, alias: undefined}))
    setMessage(null)
  }

  const closeAliasForm = () => {
    setIsAliasFormOpen(false)
    setAliasCandidate('')
    setFieldErrors(previous => ({...previous, alias: undefined}))
    focusControl('account-alias-email-toggle')
  }

  return (
    <section aria-labelledby='account-emails-title' className='flex flex-col gap-5'>
      <h2 className='fr-h4 fr-mb-0' id='account-emails-title'>Adresses e-mail</h2>

      {message && (
        <div ref={messageRef} aria-live='polite'>
          <Alert
            severity={message.severity}
            title={message.title}
            description={message.description}
          />
        </div>
      )}

      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0'>
            <p className='fr-text--xs fr-mb-1v text-gray-600'>Adresse principale</p>
            {primaryEmail ? (
              <strong className='break-all'>{primaryEmail}</strong>
            ) : (
              <p className='fr-text--sm fr-mb-0 text-gray-600'>Aucune adresse principale.</p>
            )}
          </div>

          <Button
            id='account-primary-email-toggle'
            type='button'
            iconId={primaryEmail ? 'fr-icon-edit-line' : 'fr-icon-add-line'}
            priority='tertiary no outline'
            size='small'
            disabled={disabled || Boolean(operation)}
            nativeButtonProps={{
              'aria-controls': isPrimaryFormOpen ? 'account-primary-email-form' : undefined,
              'aria-expanded': isPrimaryFormOpen,
              'aria-label': isPrimaryFormOpen
                ? 'Fermer le formulaire de modification de l’adresse principale'
                : (primaryEmail
                  ? 'Modifier l’adresse principale'
                  : 'Ajouter une adresse principale')
            }}
            onClick={togglePrimaryForm}
          >
            {isPrimaryFormOpen ? 'Fermer' : (primaryEmail ? 'Modifier' : 'Ajouter')}
          </Button>
        </div>

        {primaryVerification && (
          <VerificationCard
            disabled={disabled || Boolean(operation)}
            now={now}
            operation={operation}
            verification={primaryVerification}
            onCancel={handleCancel}
            onResend={handleResend}
          />
        )}

        {isPrimaryFormOpen && (
          <form
            noValidate
            className='bg-[var(--background-alt-grey)] p-4 md:p-5'
            id='account-primary-email-form'
            onSubmit={handlePrimaryRequest}
          >
            <div className='max-w-2xl'>
              <Input
                label='Nouvelle adresse e-mail'
                hintText={primaryEmail
                  ? 'Votre adresse actuelle reste active jusqu’à la validation. Vous devrez ensuite vous reconnecter.'
                  : 'Un lien de validation sera envoyé. Vous devrez ensuite vous reconnecter.'}
                state={fieldErrors.primary ? 'error' : 'default'}
                stateRelatedMessage={fieldErrors.primary}
                nativeInputProps={{
                  ref: primaryInputRef,
                  id: 'account-primary-email-candidate',
                  name: 'primaryEmailCandidate',
                  type: 'email',
                  autoComplete: 'email',
                  required: true,
                  disabled: disabled || Boolean(operation),
                  value: primaryCandidate,
                  onChange(event) {
                    setPrimaryCandidate(event.target.value)
                    setFieldErrors(previous => ({...previous, primary: undefined}))
                    setMessage(null)
                  }
                }}
              />
            </div>
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button type='submit' disabled={disabled || Boolean(operation)}>
                Envoyer le lien
              </Button>
              <Button
                type='button'
                priority='tertiary no outline'
                disabled={disabled || Boolean(operation)}
                onClick={closePrimaryForm}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className='flex flex-col gap-4 border-t border-gray-200 pt-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='fr-h6 fr-mb-1v'>Autres adresses</h3>
            <p className='fr-text--xs fr-mb-0 text-gray-600'>
              Elles permettent aussi de vous connecter.
            </p>
          </div>
          <Button
            id='account-alias-email-toggle'
            type='button'
            iconId='fr-icon-add-line'
            priority='secondary'
            size='small'
            disabled={disabled || Boolean(operation)}
            nativeButtonProps={{
              'aria-controls': isAliasFormOpen ? 'account-alias-email-form' : undefined,
              'aria-expanded': isAliasFormOpen,
              'aria-label': isAliasFormOpen
                ? 'Fermer le formulaire d’ajout d’une adresse e-mail'
                : 'Ajouter une adresse e-mail'
            }}
            onClick={toggleAliasForm}
          >
            {isAliasFormOpen ? 'Fermer' : 'Ajouter'}
          </Button>
        </div>

        {aliases.length === 0 ? (
          <p className='fr-text--sm fr-mb-0 text-gray-600'>
            Aucune autre adresse.
          </p>
        ) : (
          <ul className='m-0 flex list-none flex-col border-t border-gray-200 p-0'>
            {aliases.map(alias => {
              const cannotDeleteLastAddress = !primaryEmail && aliases.length === 1
              return (
                <li
                  key={alias.id ?? alias.email}
                  className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 py-3'
                >
                  <span className='min-w-0 break-all'>{alias.email}</span>
                  {cannotDeleteLastAddress ? (
                    <span className='fr-text--xs text-gray-600'>
                      Seule adresse de connexion
                    </span>
                  ) : (
                    <Button
                      iconId='fr-icon-delete-line'
                      priority='tertiary no outline'
                      size='small'
                      title={`Supprimer ${alias.email}`}
                      disabled={disabled || Boolean(operation)}
                      nativeButtonProps={{'aria-label': `Supprimer ${alias.email}`}}
                      onClick={() => handleAliasDelete(alias)}
                    >
                      Supprimer
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {aliasVerification && (
          <VerificationCard
            disabled={disabled || Boolean(operation)}
            now={now}
            operation={operation}
            verification={aliasVerification}
            onCancel={handleCancel}
            onResend={handleResend}
          />
        )}

        {isAliasFormOpen && (
          <form
            noValidate
            className='bg-[var(--background-alt-grey)] p-4 md:p-5'
            id='account-alias-email-form'
            onSubmit={handleAliasRequest}
          >
            <div className='max-w-2xl'>
              <Input
                label='Nouvelle adresse e-mail'
                hintText='Un lien de validation sera envoyé à cette adresse.'
                state={fieldErrors.alias ? 'error' : 'default'}
                stateRelatedMessage={fieldErrors.alias}
                nativeInputProps={{
                  ref: aliasInputRef,
                  id: 'account-alias-email-candidate',
                  name: 'aliasEmailCandidate',
                  type: 'email',
                  autoComplete: 'email',
                  required: true,
                  disabled: disabled || Boolean(operation),
                  value: aliasCandidate,
                  onChange(event) {
                    setAliasCandidate(event.target.value)
                    setFieldErrors(previous => ({...previous, alias: undefined}))
                    setMessage(null)
                  }
                }}
              />
            </div>
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button type='submit' disabled={disabled || Boolean(operation)}>
                Envoyer le lien
              </Button>
              <Button
                type='button'
                priority='tertiary no outline'
                disabled={disabled || Boolean(operation)}
                onClick={closeAliasForm}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

export default EmailAddressesSection
