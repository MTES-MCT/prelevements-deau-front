'use client'

import {useState, useTransition} from 'react'

import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {sourceStateLabels} from '@/lib/declaration.js'
import {requestDeclarationPointsChangeAction} from '@/server/actions/declarations.js'

const REPORT_CONTACT_EMAIL = 'contact@partageonsleau.beta.gouv.fr'

function getStatusLabel(status) {
  return sourceStateLabels[status]?.label ?? status ?? 'Non renseigné'
}

function getDeclarantLabel(declaration) {
  return declaration?.declarant
    ? getDeclarantTitleFromDeclarant(declaration.declarant)
    : 'Non renseigné'
}

const DeclarationPointsChangeRequestContext = ({declaration, periodLabel, status}) => (
  <dl className='fr-mb-3w grid gap-2 bg-gray-50 p-3 text-sm sm:grid-cols-2'>
    <div>
      <dt className='text-xs text-gray-500'>Déclaration</dt>
      <dd className='fr-mb-0 font-medium'>n°{declaration.code}</dd>
    </div>
    <div>
      <dt className='text-xs text-gray-500'>Statut</dt>
      <dd className='fr-mb-0 font-medium'>{getStatusLabel(status)}</dd>
    </div>
    <div>
      <dt className='text-xs text-gray-500'>Période</dt>
      <dd className='fr-mb-0 font-medium'>{periodLabel ?? 'Non renseignée'}</dd>
    </div>
    <div>
      <dt className='text-xs text-gray-500'>Déclarant</dt>
      <dd className='fr-mb-0 font-medium'>{getDeclarantLabel(declaration)}</dd>
    </div>
  </dl>
)

const DeclarationPointsChangeRequestModal = ({
  close,
  declaration,
  open,
  periodLabel,
  status
}) => {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState(null)
  const normalizedMessage = message.trim()
  const canSubmit = normalizedMessage.length > 0 && !isPending

  if (!open) {
    return null
  }

  const submit = event => {
    event.preventDefault()

    if (!canSubmit) {
      setResult({
        success: false,
        error: 'Ajoutez quelques mots pour préciser votre demande.'
      })
      return
    }

    setResult(null)
    startTransition(async () => {
      const response = await requestDeclarationPointsChangeAction({
        declarationId: declaration.id,
        message: normalizedMessage
      })
      setResult(response)

      if (response.success) {
        setMessage('')
      }
    })
  }

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
      <form
        aria-describedby='declaration-points-change-request-description'
        aria-labelledby='declaration-points-change-request-title'
        aria-modal='true'
        className='w-full max-w-2xl bg-white p-6 shadow-lg'
        role='dialog'
        onSubmit={submit}
      >
        <div className='mb-4 flex items-start justify-between gap-4'>
          <div>
            <h2 id='declaration-points-change-request-title' className='fr-h4 fr-mb-1w'>
              Demande d&apos;ajout ou modification de points
            </h2>
            <p id='declaration-points-change-request-description' className='fr-text--sm fr-mb-0 text-gray-700'>
              Votre demande sera envoyée à {REPORT_CONTACT_EMAIL} avec le contexte de cette déclaration.
            </p>
          </div>
          <button
            type='button'
            className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-left'
            aria-label='Fermer'
            disabled={isPending}
            onClick={close}
          />
        </div>

        <DeclarationPointsChangeRequestContext
          declaration={declaration}
          periodLabel={periodLabel}
          status={status}
        />

        <div className='fr-input-group'>
          <label className='fr-label' htmlFor='declaration-points-change-request-message'>
            <span>Description de la demande</span>
            <span className='fr-hint-text'>
              Exemples : point manquant, position à corriger, nom de point à modifier.
            </span>
          </label>
          <textarea
            id='declaration-points-change-request-message'
            className='fr-input'
            rows={6}
            value={message}
            disabled={isPending}
            onChange={event => {
              setResult(null)
              setMessage(event.target.value)
            }}
          />
        </div>

        {result?.error && (
          <p className='fr-text--sm fr-mb-2w' style={{color: 'var(--text-default-error)'}}>
            {result.error}
          </p>
        )}

        {result?.success && (
          <p className='fr-text--sm fr-mb-2w' style={{color: 'var(--text-default-success)'}}>
            Demande envoyée.
          </p>
        )}

        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <button
            className='fr-btn fr-btn--secondary'
            type='button'
            disabled={isPending}
            onClick={close}
          >
            Fermer
          </button>
          <button className='fr-btn' type='submit' disabled={!canSubmit}>
            {isPending ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    </div>
  )
}

const DeclarationPointsChangeRequestAction = ({
  buttonClassName = 'fr-btn fr-btn--secondary fr-btn--sm fr-icon-edit-line fr-btn--icon-left',
  buttonLabel = 'Demander une modification',
  declaration,
  periodLabel,
  status
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type='button'
        className={buttonClassName}
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>

      <DeclarationPointsChangeRequestModal
        close={() => setIsOpen(false)}
        declaration={declaration}
        open={isOpen}
        periodLabel={periodLabel}
        status={status}
      />
    </>
  )
}

export default DeclarationPointsChangeRequestAction
