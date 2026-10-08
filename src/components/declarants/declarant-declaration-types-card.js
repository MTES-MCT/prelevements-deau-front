'use client'

import {useEffect, useId, useRef, useState} from 'react'

import Badge from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Alert, Box, Typography} from '@mui/material'

import DeclarantManagementCard from '@/components/declarants/declarant-management-card.js'
import {
  addDeclarantDeclarationTypeAction,
  getDeclarantDeclarationTypesAction,
  removeDeclarantDeclarationTypeAction,
  updateDeclarantDeclarationTypeAction
} from '@/server/actions/declaration-types.js'

const STATUS_LABELS = {
  ACTIVE: 'Actif',
  FUTURE: 'À venir',
  EXPIRED: 'Expiré',
  UNAVAILABLE: 'Type désactivé'
}

const STATUS_SEVERITIES = {
  ACTIVE: 'success',
  FUTURE: 'info',
  EXPIRED: 'warning',
  UNAVAILABLE: 'error'
}

const emptyForm = {
  declarationTypeId: '',
  startDate: '',
  endDate: ''
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {timeZone: 'UTC'})
}

function formatPeriod({startDate, endDate}) {
  if (startDate && endDate) {
    return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
  }

  if (startDate) {
    return `À partir du ${formatDate(startDate)}`
  }

  if (endDate) {
    return `Jusqu’au ${formatDate(endDate)}`
  }

  return 'Sans limite de dates'
}

function getTypeLabel(declarationType) {
  if (!declarationType) {
    return 'Type inconnu'
  }

  return declarationType.name
}

function buildPayload(form) {
  return {
    declarationTypeId: form.declarationTypeId,
    startDate: form.startDate || null,
    endDate: form.endDate || null
  }
}

function getOptionsWithCurrent(options, link) {
  if (!link?.declarationType) {
    return options
  }

  if (options.some(option => option.id === link.declarationType.id)) {
    return options
  }

  return [link.declarationType, ...options]
}

const StatusBadge = ({status}) => (
  <Badge noIcon severity={STATUS_SEVERITIES[status] || 'info'}>
    {STATUS_LABELS[status] || status}
  </Badge>
)

const PeriodFields = ({form, onChange, disabled}) => {
  const [isExpanded, setIsExpanded] = useState(Boolean(form.startDate || form.endDate))
  const fieldsId = useId()

  return (
    <div className='flex flex-col gap-3 sm:col-span-2'>
      <div>
        <Button
          priority='tertiary no outline'
          size='small'
          type='button'
          iconId={isExpanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}
          iconPosition='right'
          aria-expanded={isExpanded}
          aria-controls={fieldsId}
          disabled={disabled}
          onClick={() => setIsExpanded(previous => !previous)}
        >
          Limiter à une période
        </Button>
      </div>
      {!isExpanded && <p className='fr-text--sm fr-mb-0'>{formatPeriod(form)}</p>}
      <div id={fieldsId} hidden={!isExpanded}>
        <p className='fr-hint-text fr-mb-2w'>
          Vous pouvez renseigner une date de début, une date de fin, ou les deux.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Input
            className='mb-0'
            label='Date de début (facultative)'
            disabled={disabled}
            nativeInputProps={{
              type: 'date',
              value: form.startDate,
              onChange: event => onChange(previous => ({...previous, startDate: event.target.value}))
            }}
          />
          <Input
            className='mb-0'
            label='Date de fin (facultative)'
            disabled={disabled}
            nativeInputProps={{
              type: 'date',
              value: form.endDate,
              onChange: event => onChange(previous => ({...previous, endDate: event.target.value}))
            }}
          />
        </div>
      </div>
    </div>
  )
}

const DeclarantDeclarationTypesCard = ({declarantId, initialPayload}) => {
  const [links, setLinks] = useState(initialPayload?.data ?? [])
  const [options, setOptions] = useState(initialPayload?.meta?.availableDeclarationTypes ?? [])
  const [canManage, setCanManage] = useState(Boolean(initialPayload?.meta?.canManage))
  const [form, setForm] = useState(emptyForm)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(emptyForm)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addButtonRef = useRef(null)
  const creationSelectRef = useRef(null)
  const editingSelectRef = useRef(null)
  const editButtonRefs = useRef(new Map())
  const previousEditor = useRef({isAdding: false, editingId: null})

  useEffect(() => {
    if (isAdding) {
      creationSelectRef.current?.focus()
    } else if (editingId) {
      editingSelectRef.current?.focus()
    } else if (previousEditor.current.isAdding) {
      addButtonRef.current?.focus()
    } else if (previousEditor.current.editingId) {
      editButtonRefs.current.get(previousEditor.current.editingId)?.focus()
    }

    previousEditor.current = {isAdding, editingId}
  }, [isAdding, editingId])

  const applyPayload = payload => {
    setLinks(payload?.data ?? [])
    setOptions(payload?.meta?.availableDeclarationTypes ?? [])
    setCanManage(Boolean(payload?.meta?.canManage))
  }

  const refresh = async () => {
    const result = await getDeclarantDeclarationTypesAction(declarantId)

    if (result.success) {
      applyPayload(result.data)
    }
  }

  const runAction = async action => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const result = await action()

      if (!result.success) {
        setError(result.error || result.data?.message || 'Une erreur est survenue.')
        return false
      }

      if (result.data?.data) {
        applyPayload(result.data)
      } else {
        await refresh()
      }

      return true
    } catch (error_) {
      setError(error_.message || 'Une erreur est survenue.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitCreation = async event => {
    event.preventDefault()

    if (isSubmitting || !canManage) {
      return
    }

    if (!form.declarationTypeId) {
      setError('Sélectionnez un type de déclaration.')
      return
    }

    const success = await runAction(() => addDeclarantDeclarationTypeAction(declarantId, buildPayload(form)))

    if (success) {
      setForm(emptyForm)
      setIsAdding(false)
      setMessage('Autorisation ajoutée.')
    }
  }

  const startEditing = link => {
    setIsAdding(false)
    setForm(emptyForm)
    setEditingId(link.id)
    setEditingDraft({
      declarationTypeId: link.declarationTypeId,
      startDate: link.startDate || '',
      endDate: link.endDate || ''
    })
    setError(null)
    setMessage(null)
  }

  const submitEdition = async link => {
    if (isSubmitting || !canManage) {
      return
    }

    if (!editingDraft.declarationTypeId) {
      setError('Sélectionnez un type de déclaration.')
      return
    }

    const success = await runAction(() => updateDeclarantDeclarationTypeAction(
      declarantId,
      link.id,
      buildPayload(editingDraft)
    ))

    if (success) {
      setEditingId(null)
      setMessage('Autorisation mise à jour.')
    }
  }

  const removeLink = async link => {
    if (isSubmitting || !canManage) {
      return
    }

    if (!window.confirm(`Retirer l’autorisation « ${getTypeLabel(link.declarationType)} » de ce déclarant ?`)) {
      return
    }

    const success = await runAction(() => removeDeclarantDeclarationTypeAction(declarantId, link.id))

    if (success) {
      setMessage('Autorisation retirée.')
    }
  }

  const cancelCreation = () => {
    setIsAdding(false)
    setForm(emptyForm)
    setError(null)
  }

  const cancelEdition = () => {
    setEditingId(null)
    setEditingDraft(emptyForm)
    setError(null)
  }

  return (
    <DeclarantManagementCard
      id='declarant-declaration-types'
      title='Types de déclaration autorisés'
      description='Les déclarations que ce déclarant peut déposer dans « Mes déclarations ».'
    >
      <div className='flex flex-col gap-4'>
        {(message || error) && (
          <Alert severity={error ? 'error' : 'success'} onClose={() => {
            setMessage(null)
            setError(null)
          }}
          >
            {error || message}
          </Alert>
        )}

        {links.length === 0 ? (
          <Alert severity='info'>
            Aucun type de déclaration n’est autorisé pour ce déclarant.
          </Alert>
        ) : (
          <div className='flex flex-col gap-3'>
            {links.map(link => {
              const isEditing = editingId === link.id
              const selectOptions = getOptionsWithCurrent(options, link)

              return (
                <Box key={link.id} className='border-t border-[var(--border-default-grey)] pt-4 flex min-w-0 flex-col gap-3'>
                  <Box className='flex justify-between gap-3 flex-wrap'>
                    <Box>
                      <Box className='flex gap-2 items-center flex-wrap'>
                        <Typography component='h3' variant='subtitle1' fontWeight='bold'>
                          {link.declarationType?.name || 'Type inconnu'}
                        </Typography>
                        <StatusBadge status={link.status} />
                      </Box>
                      {!isEditing && <p className='fr-text--sm fr-mb-0'>{formatPeriod(link)}</p>}
                    </Box>

                    {canManage && !isEditing && (
                      <Box className='flex gap-2 flex-wrap'>
                        <Button
                          ref={element => {
                            if (element) {
                              editButtonRefs.current.set(link.id, element)
                            } else {
                              editButtonRefs.current.delete(link.id)
                            }
                          }}
                          priority='secondary'
                          size='small'
                          disabled={isSubmitting || isAdding || Boolean(editingId)}
                          onClick={() => startEditing(link)}
                        >
                          Modifier
                        </Button>
                        <Button
                          priority='tertiary no outline'
                          size='small'
                          disabled={isSubmitting || isAdding || Boolean(editingId)}
                          onClick={() => removeLink(link)}
                        >
                          Retirer
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {isEditing && canManage && (
                    <form
                      className='grid grid-cols-1 sm:grid-cols-2 gap-3 items-end'
                      onSubmit={event => {
                        event.preventDefault()
                        void submitEdition(link)
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Escape' && !isSubmitting) {
                          event.preventDefault()
                          cancelEdition()
                        }
                      }}
                    >
                      <div className='fr-input-group mb-0 sm:col-span-2'>
                        <label className='fr-label' htmlFor={`declaration-type-${link.id}`}>Type de déclaration</label>
                        <select
                          ref={editingSelectRef}
                          className='fr-select'
                          id={`declaration-type-${link.id}`}
                          value={editingDraft.declarationTypeId}
                          disabled={isSubmitting}
                          onChange={event => setEditingDraft(previous => ({...previous, declarationTypeId: event.target.value}))}
                        >
                          {selectOptions.map(option => (
                            <option key={option.id} value={option.id}>{getTypeLabel(option)}</option>
                          ))}
                        </select>
                      </div>
                      <PeriodFields
                        key={link.id}
                        form={editingDraft}
                        onChange={setEditingDraft}
                        disabled={isSubmitting}
                      />
                      <div className='flex justify-end gap-3 flex-wrap sm:col-span-2'>
                        <Button priority='secondary' size='small' type='button' disabled={isSubmitting} onClick={cancelEdition}>
                          Annuler
                        </Button>
                        <Button size='small' type='submit' disabled={isSubmitting}>
                          Enregistrer
                        </Button>
                      </div>
                    </form>
                  )}
                </Box>
              )
            })}
          </div>
        )}

        {canManage && (
          <div className='border-t border-[var(--border-default-grey)] pt-4'>
            {isAdding ? (
              <form
                className='grid grid-cols-1 sm:grid-cols-2 gap-4 items-end'
                onSubmit={submitCreation}
                onKeyDown={event => {
                  if (event.key === 'Escape' && !isSubmitting) {
                    event.preventDefault()
                    cancelCreation()
                  }
                }}
              >
                <div className='fr-input-group mb-0 sm:col-span-2'>
                  <label className='fr-label' htmlFor='declaration-type-select'>Type de déclaration</label>
                  <select
                    ref={creationSelectRef}
                    className='fr-select'
                    id='declaration-type-select'
                    value={form.declarationTypeId}
                    disabled={isSubmitting}
                    onChange={event => setForm(previous => ({...previous, declarationTypeId: event.target.value}))}
                  >
                    <option value=''>Sélectionner un type</option>
                    {options.map(option => (
                      <option key={option.id} value={option.id}>{getTypeLabel(option)}</option>
                    ))}
                  </select>
                </div>
                <PeriodFields form={form} onChange={setForm} disabled={isSubmitting} />
                <div className='flex justify-end gap-3 flex-wrap sm:col-span-2'>
                  <Button priority='secondary' type='button' disabled={isSubmitting} onClick={cancelCreation}>
                    Annuler
                  </Button>
                  <Button disabled={isSubmitting || options.length === 0} type='submit'>
                    Ajouter
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                ref={addButtonRef}
                priority='secondary'
                size='small'
                iconId='fr-icon-add-line'
                disabled={isSubmitting || options.length === 0 || Boolean(editingId)}
                onClick={() => {
                  setIsAdding(true)
                  setError(null)
                  setMessage(null)
                }}
              >
                Ajouter un type
              </Button>
            )}

            {options.length === 0 && (
              <Alert severity='warning' className='mt-3'>
                Aucun type actif n’est disponible sur la plateforme. Un administrateur doit d’abord créer ou réactiver un type.
              </Alert>
            )}
          </div>
        )}
      </div>
    </DeclarantManagementCard>
  )
}

export default DeclarantDeclarationTypesCard
