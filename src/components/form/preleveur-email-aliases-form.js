'use client'

import {useCallback, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Alert, Typography} from '@mui/material'

import {CopyEmailButton} from '@/components/ui/CopyableEmail/index.js'
import {
  createDeclarantEmailAliasAction,
  deleteDeclarantEmailAliasAction
} from '@/server/actions/declarants.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

const PreleveurEmailAliasChip = ({
  aliasId,
  email,
  disabled,
  onDelete
}) => {
  const handleDelete = useCallback(() => {
    onDelete(aliasId)
  }, [aliasId, onDelete])

  return (
    <span className={`group inline-flex max-w-full items-center gap-0.5 rounded-full bg-[var(--background-contrast-grey)] py-1 pl-3 text-sm text-[var(--text-default-grey)] ${onDelete ? 'pr-1' : 'pr-2'} ${disabled ? 'opacity-60' : ''}`}>
      <span className='min-w-0 truncate'>{email}</span>
      <CopyEmailButton revealOnHover email={email} />
      {onDelete && (
        <button
          aria-label={`Supprimer l’alias ${email}`}
          className='fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-close-line !h-6 !min-h-6 !w-6 !min-w-6 !p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100'
          disabled={disabled}
          style={{color: 'var(--text-mention-grey)'}}
          type='button'
          onClick={handleDelete}
        />
      )}
    </span>
  )
}

const PreleveurEmailAliasesForm = ({
  canManage = false,
  declarantId,
  primaryEmail,
  initialAliases = []
}) => {
  const [aliases, setAliases] = useState(initialAliases)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingAliasId, setDeletingAliasId] = useState(null)

  const normalizedPrimaryEmail = useMemo(
    () => normalizeEmail(primaryEmail),
    [primaryEmail]
  )

  const normalizedAliases = useMemo(
    () => new Set(aliases.map(alias => normalizeEmail(alias.email))),
    [aliases]
  )

  const handleAddAlias = useCallback(async () => {
    setError(null)
    setMessage(null)
    setValidationError(null)

    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      setValidationError('Veuillez saisir une adresse e-mail.')
      return
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setValidationError('Veuillez saisir une adresse e-mail valide.')
      return
    }

    if (normalizedPrimaryEmail && normalizedEmail === normalizedPrimaryEmail) {
      setValidationError('Un alias ne peut pas être identique à l’adresse e-mail principale.')
      return
    }

    if (normalizedAliases.has(normalizedEmail)) {
      setValidationError('Cet alias est déjà présent pour ce déclarant.')
      return
    }

    setIsAdding(true)

    try {
      const response = await createDeclarantEmailAliasAction(declarantId, normalizedEmail)

      if (!response.success) {
        setError(response.error || 'L’ajout de l’alias a échoué.')
        return
      }

      setAliases(previousAliases => [...previousAliases, response.data])
      setEmail('')
      setMessage('Alias e-mail ajouté.')
    } catch {
      setError('L’ajout de l’alias a échoué.')
    } finally {
      setIsAdding(false)
    }
  }, [
    declarantId,
    email,
    normalizedAliases,
    normalizedPrimaryEmail
  ])

  const handleAddAliasClick = useCallback(() => {
    handleAddAlias()
  }, [handleAddAlias])

  const handleDeleteAlias = useCallback(async aliasId => {
    setError(null)
    setMessage(null)
    setValidationError(null)
    setDeletingAliasId(aliasId)

    try {
      const response = await deleteDeclarantEmailAliasAction(declarantId, aliasId)

      if (!response.success) {
        setError(response.error || 'La suppression de l’alias a échoué.')
        return
      }

      setAliases(previousAliases => previousAliases.filter(alias => alias.id !== aliasId))
      setMessage('Alias e-mail supprimé.')
    } catch {
      setError('La suppression de l’alias a échoué.')
    } finally {
      setDeletingAliasId(null)
    }
  }, [declarantId])

  const handleEmailChange = useCallback(event => {
    setMessage(null)
    setEmail(event.target.value)
  }, [])

  const handleEmailKeyDown = useCallback(event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddAlias()
    }
  }, [handleAddAlias])

  const nativeInputProps = useMemo(() => ({
    type: 'email',
    value: email,
    placeholder: 'Entrer un alias e-mail',
    onChange: handleEmailChange,
    onKeyDown: handleEmailKeyDown
  }), [
    email,
    handleEmailChange,
    handleEmailKeyDown
  ])

  if (!declarantId) {
    return null
  }

  return (
    <div className='flex flex-col gap-4'>
      {aliases.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {aliases.map(alias => (
            <PreleveurEmailAliasChip
              key={alias.id}
              aliasId={alias.id}
              disabled={deletingAliasId === alias.id}
              email={alias.email}
              onDelete={canManage ? handleDeleteAlias : undefined}
            />
          ))}
        </div>
      )}

      {aliases.length === 0 && (
        <Typography variant='body2'>
          Aucun alias renseigné.
        </Typography>
      )}

      {canManage && <div className='flex flex-col md:flex-row md:items-end gap-3'>
        <div className='flex-1'>
          <Input
            label='Nouvel alias e-mail'
            hintText='Exemple : autre.adresse@example.fr'
            state={validationError ? 'error' : 'default'}
            stateRelatedMessage={validationError || undefined}
            nativeInputProps={nativeInputProps}
          />
        </div>

        <div className='md:pb-6'>
          <Button
            disabled={isAdding}
            priority='secondary'
            onClick={handleAddAliasClick}
          >
            Ajouter cet alias
          </Button>
        </div>
      </div>}

      {message && (
        <Alert severity='success' onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity='error' onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </div>
  )
}

export default PreleveurEmailAliasesForm
