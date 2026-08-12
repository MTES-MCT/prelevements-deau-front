'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {
  deleteExploitationAction,
  deletePointPrelevementAction
} from '@/server/actions/index.js'

const resourceConfigurations = {
  exploitation: {
    action: deleteExploitationAction,
    label: 'l’exploitation',
    title: 'Supprimer l’exploitation'
  },
  point: {
    action: deletePointPrelevementAction,
    label: 'le point de prélèvement',
    title: 'Supprimer le point de prélèvement'
  }
}

const ResourceDeleteAction = ({id, redirectHref, resource}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const configuration = resourceConfigurations[resource]

  if (!configuration) {
    return null
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const result = await configuration.action(id)
      if (!result.success) {
        setError(result.error || 'La suppression a échoué.')
        setOpen(false)
        return
      }

      router.push(redirectHref)
    } catch (deleteError) {
      setError(deleteError.message)
      setOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className='border border-red-500 p-4' aria-label='Action sensible'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='fr-mb-0 font-medium text-red-700'>{configuration.title}</p>
          <p className='fr-mb-0 fr-text--sm text-gray-700'>Cette action est irréversible.</p>
        </div>
        <Button
          iconId='fr-icon-delete-line'
          priority='secondary'
          size='small'
          style={{
            boxShadow: 'inset 0 0 0 1px var(--app-delete-border, #ce0500)',
            color: 'var(--app-color-error, #ce0500)'
          }}
          onClick={() => setOpen(true)}
        >
          Supprimer
        </Button>
      </div>

      {error && (
        <Alert
          closable
          small
          className='mt-3'
          description={error}
          severity='error'
          title='Suppression impossible'
          onClose={() => setError(null)}
        />
      )}

      <Dialog maxWidth='sm' open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{configuration.title}</DialogTitle>
        <DialogContent>
          Êtes-vous sûr de vouloir supprimer {configuration.label} ? Cette action est irréversible.
        </DialogContent>
        <DialogActions className='m-3'>
          <Button priority='secondary' onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            disabled={deleting}
            style={{backgroundColor: 'var(--app-delete-background, #ce0500)'}}
            onClick={handleDelete}
          >
            {deleting ? 'Suppression…' : 'Confirmer la suppression'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  )
}

export default ResourceDeleteAction
