'use client'

import {useMemo, useState} from 'react'

import Badge from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Alert, Box, Typography} from '@mui/material'

import SectionCard from '@/components/ui/SectionCard/index.js'
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
  if (!date) {
    return 'Non bornée'
  }

  return new Date(date).toLocaleDateString('fr-FR')
}

function getTypeLabel(declarationType) {
  if (!declarationType) {
    return 'Type inconnu'
  }

  return `${declarationType.name} (${declarationType.code})`
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

const DeclarantDeclarationTypesCard = ({declarantId, initialPayload}) => {
  const [links, setLinks] = useState(initialPayload?.data ?? [])
  const [options, setOptions] = useState(initialPayload?.meta?.availableDeclarationTypes ?? [])
  const [canManage, setCanManage] = useState(Boolean(initialPayload?.meta?.canManage))
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(emptyForm)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const counters = useMemo(() => ({
    active: links.filter(link => link.status === 'ACTIVE').length,
    future: links.filter(link => link.status === 'FUTURE').length,
    expired: links.filter(link => link.status === 'EXPIRED').length,
    unavailable: links.filter(link => link.status === 'UNAVAILABLE').length
  }), [links])

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

    if (!form.declarationTypeId) {
      setError('Sélectionnez un type de déclaration.')
      return
    }

    const success = await runAction(() => addDeclarantDeclarationTypeAction(declarantId, buildPayload(form)))

    if (success) {
      setForm(emptyForm)
      setMessage('Autorisation ajoutée.')
    }
  }

  const startEditing = link => {
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
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Retirer l’autorisation « ${getTypeLabel(link.declarationType)} » de ce déclarant ?`)) {
      return
    }

    const success = await runAction(() => removeDeclarantDeclarationTypeAction(declarantId, link.id))

    if (success) {
      setMessage('Autorisation retirée.')
    }
  }

  return (
    <SectionCard
      title='Types de déclaration autorisés'
      icon='ri-file-list-3-line'
      editorOnly={false}
    >
      <div className='flex flex-col gap-4'>
        <Box className='flex gap-2 flex-wrap'>
          <Badge noIcon severity='success'>{counters.active} actif{counters.active > 1 ? 's' : ''}</Badge>
          <Badge noIcon severity='info'>{counters.future} à venir</Badge>
          <Badge noIcon severity='warning'>{counters.expired} expiré{counters.expired > 1 ? 's' : ''}</Badge>
          {counters.unavailable > 0 && (
            <Badge noIcon severity='error'>{counters.unavailable} désactivé{counters.unavailable > 1 ? 's' : ''}</Badge>
          )}
        </Box>

        <p className='fr-text--sm fr-mb-0'>
          Ces autorisations déterminent les types de déclaration que ce déclarant peut déposer dans “Mes déclarations”.
        </p>

        {(message || error) && (
          <Alert severity={error ? 'error' : 'success'} onClose={() => {
            setMessage(null)
            setError(null)
          }}
          >
            {error || message}
          </Alert>
        )}

        {canManage && (
          <form className='grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end' onSubmit={submitCreation}>
            <div className='fr-input-group'>
              <label className='fr-label' htmlFor='declaration-type-select'>Type de déclaration</label>
              <select
                className='fr-select'
                id='declaration-type-select'
                value={form.declarationTypeId}
                onChange={event => setForm(previous => ({...previous, declarationTypeId: event.target.value}))}
              >
                <option value=''>Sélectionner un type</option>
                {options.map(option => (
                  <option key={option.id} value={option.id}>{getTypeLabel(option)}</option>
                ))}
              </select>
            </div>
            <Input
              label='Début'
              nativeInputProps={{
                type: 'date',
                value: form.startDate,
                onChange: event => setForm(previous => ({...previous, startDate: event.target.value}))
              }}
            />
            <Input
              label='Fin'
              nativeInputProps={{
                type: 'date',
                value: form.endDate,
                onChange: event => setForm(previous => ({...previous, endDate: event.target.value}))
              }}
            />
            <Button disabled={isSubmitting || options.length === 0} type='submit'>
              Autoriser
            </Button>
          </form>
        )}

        {options.length === 0 && canManage && (
          <Alert severity='warning'>
            Aucun type actif n’est disponible sur la plateforme. Un administrateur doit d’abord créer ou réactiver un type.
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
                <Box key={link.id} className='border p-3 flex flex-col gap-3'>
                  <Box className='flex justify-between gap-3 flex-wrap'>
                    <Box>
                      <Box className='flex gap-2 items-center flex-wrap'>
                        <Typography variant='subtitle1' fontWeight='bold'>
                          {link.declarationType?.name || 'Type inconnu'}
                        </Typography>
                        <StatusBadge status={link.status} />
                      </Box>
                      <p className='fr-text--sm fr-mb-0'>
                        <code>{link.declarationType?.code}</code> · Version {link.declarationType?.version || 1}
                      </p>
                    </Box>

                    {canManage && (
                      <Box className='flex gap-2 flex-wrap'>
                        {isEditing ? (
                          <>
                            <Button priority='secondary' size='small' onClick={() => setEditingId(null)}>
                              Annuler
                            </Button>
                            <Button size='small' disabled={isSubmitting} onClick={() => submitEdition(link)}>
                              Enregistrer
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button priority='secondary' size='small' onClick={() => startEditing(link)}>
                              Modifier
                            </Button>
                            <Button priority='tertiary no outline' size='small' onClick={() => removeLink(link)}>
                              Retirer
                            </Button>
                          </>
                        )}
                      </Box>
                    )}
                  </Box>

                  {isEditing ? (
                    <Box className='grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3 items-end'>
                      <div className='fr-input-group'>
                        <label className='fr-label' htmlFor={`declaration-type-${link.id}`}>Type</label>
                        <select
                          className='fr-select'
                          id={`declaration-type-${link.id}`}
                          value={editingDraft.declarationTypeId}
                          onChange={event => setEditingDraft(previous => ({...previous, declarationTypeId: event.target.value}))}
                        >
                          {selectOptions.map(option => (
                            <option key={option.id} value={option.id}>{getTypeLabel(option)}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label='Début'
                        nativeInputProps={{
                          type: 'date',
                          value: editingDraft.startDate,
                          onChange: event => setEditingDraft(previous => ({...previous, startDate: event.target.value}))
                        }}
                      />
                      <Input
                        label='Fin'
                        nativeInputProps={{
                          type: 'date',
                          value: editingDraft.endDate,
                          onChange: event => setEditingDraft(previous => ({...previous, endDate: event.target.value}))
                        }}
                      />
                    </Box>
                  ) : (
                    <Box className='grid grid-cols-1 md:grid-cols-2 gap-2 fr-text--sm'>
                      <span>Début : {formatDate(link.startDate)}</span>
                      <span>Fin : {formatDate(link.endDate)}</span>
                    </Box>
                  )}
                </Box>
              )
            })}
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default DeclarantDeclarationTypesCard
