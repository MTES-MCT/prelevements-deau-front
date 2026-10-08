'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {deletePreleveurAction} from '@/server/actions/index.js'

const PreleveurDeleteSection = ({preleveur}) => {
  const router = useRouter()

  const [error, setError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeletePreleveur = async () => {
    setError(null)

    try {
      const response = await deletePreleveurAction(preleveur.userId || preleveur.id || preleveur._id)

      if (!response.success) {
        setIsDialogOpen(false)
        setError(response.error)
        return
      }

      router.push('/declarants')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <section aria-labelledby='declarant-delete-title' className='border-t border-[var(--border-default-grey)] pt-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 id='declarant-delete-title' className='fr-h6 fr-mb-1w'>Supprimer le déclarant</h2>
          <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
            Suppression définitive, uniquement si aucune exploitation n’est en activité.
          </p>
        </div>
        <div>
          <Button
            priority='secondary'
            style={{
              color: 'var(--text-default-error)',
              boxShadow: 'inset 0 0 0 1px var(--border-plain-error)'
            }}
            onClick={() => setIsDialogOpen(!isDialogOpen)}
          >
            Supprimer
          </Button>
        </div>
        <Dialog
          open={isDialogOpen}
          maxWidth='md'
          onClose={() => setIsDialogOpen(false)}
        >
          <DialogTitle><InfoOutlined className='mr-3' />Confirmer la suppression de ce déclarant</DialogTitle>
          <DialogContent>
            Êtes-vous sûr de vouloir supprimer ce déclarant ? Cette action est irréversible.
            <p>
              <small>Vous ne pourrez pas le supprimer s&apos;il dispose d&apos;exploitations en activité.</small>
            </p>
          </DialogContent>
          <DialogActions className='m-3'>
            <Button
              priority='secondary'
              onClick={() => setIsDialogOpen(!isDialogOpen)}
            >
              Annuler
            </Button>
            <Button
              style={{backgroundColor: 'var(--app-delete-background, red)'}}
              onClick={handleDeletePreleveur}
            >
              Supprimer ce déclarant
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      {error && (
        <div role='alert' className='mt-4 text-[var(--text-default-error)]'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
    </section>
  )
}

export default PreleveurDeleteSection
