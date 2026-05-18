'use client'

import {useMemo, useState} from 'react'

import Badge from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Alert, Box, Typography} from '@mui/material'

import {
  createDeclarationTypeAction,
  disableDeclarationTypeAction,
  listDeclarationTypesAction,
  restoreDeclarationTypeAction,
  updateDeclarationTypeAction
} from '@/server/actions/declaration-types.js'

function normalizeFormValue(value) {
  return String(value ?? '').trim()
}

function getPayloadFromResult(result) {
  return result?.data ?? null
}

function getItemsFromResult(result) {
  const payload = getPayloadFromResult(result)
  return payload?.data ?? []
}

const emptyForm = {
  code: '',
  name: '',
  version: 1
}

const DeclarationTypeBadge = ({isAvailable}) => (
  <Badge noIcon severity={isAvailable ? 'success' : 'warning'}>
    {isAvailable ? 'Actif' : 'Désactivé'}
  </Badge>
)

const DeclarationTypesAdmin = ({initialPayload}) => {
  const [items, setItems] = useState(initialPayload?.data ?? [])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState({name: '', version: 1, isAvailable: true})
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(item => item.isAvailable).length,
    inactive: items.filter(item => !item.isAvailable).length,
    declarants: items.reduce((sum, item) => sum + (item.declarantsCount || 0), 0)
  }), [items])

  const refresh = async () => {
    const result = await listDeclarationTypesAction()

    if (result.success) {
      setItems(getItemsFromResult(result))
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

      await refresh()
      return true
    } catch (error_) {
      setError(error_.message || 'Une erreur est survenue.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const createDeclarationType = async event => {
    event.preventDefault()

    const payload = {
      code: normalizeFormValue(form.code),
      name: normalizeFormValue(form.name),
      version: Number(form.version || 1),
      isAvailable: true
    }

    if (!payload.code || !payload.name) {
      setError('Le code et le libellé sont obligatoires.')
      return
    }

    const success = await runAction(() => createDeclarationTypeAction(payload))

    if (success) {
      setForm(emptyForm)
      setMessage('Type de déclaration créé.')
    }
  }

  const startEditing = item => {
    setEditingId(item.id)
    setEditingDraft({
      name: item.name,
      version: item.version || 1,
      isAvailable: item.isAvailable
    })
    setError(null)
    setMessage(null)
  }

  const saveEdition = async item => {
    const payload = {
      name: normalizeFormValue(editingDraft.name),
      version: Number(editingDraft.version || 1),
      isAvailable: Boolean(editingDraft.isAvailable)
    }

    if (!payload.name) {
      setError('Le libellé est obligatoire.')
      return
    }

    const success = await runAction(() => updateDeclarationTypeAction(item.id, payload))

    if (success) {
      setEditingId(null)
      setMessage('Type de déclaration mis à jour.')
    }
  }

  const disableType = async item => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Désactiver le type de déclaration « ${item.name} » ? Les déclarants ne pourront plus déposer ce type tant qu’il est désactivé.`)) {
      return
    }

    const success = await runAction(() => disableDeclarationTypeAction(item.id))

    if (success) {
      setMessage('Type de déclaration désactivé.')
    }
  }

  const restoreType = async item => {
    const success = await runAction(() => restoreDeclarationTypeAction(item.id))

    if (success) {
      setMessage('Type de déclaration réactivé.')
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {(message || error) && (
        <Alert severity={error ? 'error' : 'success'} onClose={() => {
          setMessage(null)
          setError(null)
        }}
        >
          {error || message}
        </Alert>
      )}

      <Box
        className='grid grid-cols-1 md:grid-cols-4 gap-4'
      >
        <Box className='border p-4'>
          <p className='fr-text--sm fr-mb-1w'>Total</p>
          <p className='fr-h3 fr-mb-0'>{stats.total}</p>
        </Box>
        <Box className='border p-4'>
          <p className='fr-text--sm fr-mb-1w'>Actifs</p>
          <p className='fr-h3 fr-mb-0'>{stats.active}</p>
        </Box>
        <Box className='border p-4'>
          <p className='fr-text--sm fr-mb-1w'>Désactivés</p>
          <p className='fr-h3 fr-mb-0'>{stats.inactive}</p>
        </Box>
        <Box className='border p-4'>
          <p className='fr-text--sm fr-mb-1w'>Autorisations</p>
          <p className='fr-h3 fr-mb-0'>{stats.declarants}</p>
        </Box>
      </Box>

      <Box className='border p-4'>
        <Typography variant='h5' className='fr-mb-2w'>
          Ajouter un type de déclaration
        </Typography>
        <form className='grid grid-cols-1 md:grid-cols-[1fr_2fr_120px_auto] gap-4 items-end' onSubmit={createDeclarationType}>
          <Input
            label='Code technique'
            hintText='Ex. volumes-mensuels'
            nativeInputProps={{
              value: form.code,
              onChange: event => setForm(previous => ({...previous, code: event.target.value}))
            }}
          />
          <Input
            label='Libellé affiché'
            hintText='Ex. Déclaration mensuelle de volumes'
            nativeInputProps={{
              value: form.name,
              onChange: event => setForm(previous => ({...previous, name: event.target.value}))
            }}
          />
          <Input
            label='Version'
            nativeInputProps={{
              type: 'number',
              min: 1,
              value: form.version,
              onChange: event => setForm(previous => ({...previous, version: event.target.value}))
            }}
          />
          <Button disabled={isSubmitting} type='submit'>
            Ajouter
          </Button>
        </form>
      </Box>

      <Box className='flex items-center justify-between gap-4 flex-wrap'>
        <Typography variant='h5'>Types autorisés sur la plateforme</Typography>
        <p className='fr-text--sm fr-mb-0'>{items.length} type{items.length > 1 ? 's' : ''} affiché{items.length > 1 ? 's' : ''}</p>
      </Box>

      {items.length === 0 ? (
        <Alert severity='info'>Aucun type de déclaration n’est encore configuré.</Alert>
      ) : (
        <div className='grid grid-cols-1 gap-3'>
          {items.map(item => {
            const isEditing = editingId === item.id

            return (
              <Box key={item.id} className='border p-4 flex flex-col gap-3'>
                <Box className='flex justify-between gap-4 flex-wrap'>
                  <Box>
                    <Box className='flex items-center gap-2 flex-wrap'>
                      <Typography variant='h6'>{item.name}</Typography>
                      <DeclarationTypeBadge isAvailable={item.isAvailable} />
                    </Box>
                    <p className='fr-text--sm fr-mb-0'>
                      <b>Code :</b> <code>{item.code}</code> · <b>Version :</b> {item.version}
                    </p>
                  </Box>
                  <Box className='flex gap-2 flex-wrap items-start'>
                    {isEditing ? (
                      <>
                        <Button priority='secondary' disabled={isSubmitting} onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                        <Button disabled={isSubmitting} onClick={() => saveEdition(item)}>
                          Enregistrer
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button priority='secondary' onClick={() => startEditing(item)}>
                          Modifier
                        </Button>
                        {item.isAvailable ? (
                          <Button priority='tertiary no outline' onClick={() => disableType(item)}>
                            Désactiver
                          </Button>
                        ) : (
                          <Button priority='secondary' onClick={() => restoreType(item)}>
                            Réactiver
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                {isEditing && (
                  <Box className='grid grid-cols-1 md:grid-cols-[2fr_120px_auto] gap-4 items-end'>
                    <Input
                      label='Libellé affiché'
                      nativeInputProps={{
                        value: editingDraft.name,
                        onChange: event => setEditingDraft(previous => ({...previous, name: event.target.value}))
                      }}
                    />
                    <Input
                      label='Version'
                      nativeInputProps={{
                        type: 'number',
                        min: 1,
                        value: editingDraft.version,
                        onChange: event => setEditingDraft(previous => ({...previous, version: event.target.value}))
                      }}
                    />
                    <label className='fr-checkbox-group fr-mb-2w'>
                      <input
                        type='checkbox'
                        checked={editingDraft.isAvailable}
                        onChange={event => setEditingDraft(previous => ({...previous, isAvailable: event.target.checked}))}
                      />
                      <span className='fr-label'>Actif</span>
                    </label>
                  </Box>
                )}

                <Box className='grid grid-cols-1 md:grid-cols-3 gap-2 fr-text--sm'>
                  <span>{item.declarantsCount || 0} autorisation{item.declarantsCount > 1 ? 's' : ''} déclarant</span>
                  <span>{item.declarationsCount || 0} déclaration{item.declarationsCount > 1 ? 's' : ''} déposée{item.declarationsCount > 1 ? 's' : ''}</span>
                  <span>Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</span>
                </Box>
              </Box>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DeclarationTypesAdmin
