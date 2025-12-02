'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'
import {useRouter} from 'next/navigation'

import {deletePreleveur} from '@/app/api/points-prelevement.js'

const PreleveurDeleteSection = ({preleveur}) => {
  const router = useRouter()

  const [error, setError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeletePreleveur = async () => {
    setError(null)

    try {
      const response = await deletePreleveur(preleveur._id)

      if (response.code) {
        setIsDialogOpen(false)
        setError(response.message)
        return
      }

      router.push('/preleveurs')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className='fr-container mb-8'>
      <div className='border border-red-500 rounded-sm p-5'>
        <div className='text-red-500'>
          <InfoOutlined className='mr-3' />
          Action sensible : Supprimer le préleveur
        </div>
        <div className='ml-8'>
          Cette action est irréversible et peut avoir des conséquences importantes
        </div>
        <div className='ml-8 mt-5'>
          <Button
            priority='secondary'
            style={{
              color: 'red',
              boxShadow: '0 0 0 1px red'
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
          <DialogTitle><InfoOutlined className='mr-3' />Confirmer la suppression de ce préleveur</DialogTitle>
          <DialogContent>
            Êtes-vous sûr de vouloir supprimer ce préleveur ? Cette action est irréversible.
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
              style={{backgroundColor: 'red'}}
              onClick={handleDeletePreleveur}
            >
              Supprimer ce préleveur
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
    </div>
  )
}

export default PreleveurDeleteSection
