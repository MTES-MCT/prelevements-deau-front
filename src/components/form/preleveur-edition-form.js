'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material'
import {useRouter} from 'next/navigation'

import PreleveurMoralForm from './preleveur-moral-form.js'
import PreleveurPhysiqueForm from './preleveur-physique-form.js'

import {updatePreleveur, deletePreleveur} from '@/app/api/points-prelevement.js'
import {emptyStringToNull} from '@/utils/string.js'

const PreleveurEditionForm = ({preleveur}) => {
  const router = useRouter()

  const isPreleveurPhysique = !preleveur.code_siren

  const [payload, setPayload] = useState({})
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState()

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors(null)

    try {
      const cleanedPreleveur = emptyStringToNull(payload)
      const response = await updatePreleveur(preleveur.id_preleveur, cleanedPreleveur)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        router.push(`/preleveurs/${response.id_preleveur}`)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleDeletePreleveur = async () => {
    setError(null)

    try {
      await deletePreleveur(preleveur.id_preleveur)
      router.push('/preleveurs')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        Édition d&apos;un préleveur
      </Typography>
      {isPreleveurPhysique ? (
        <PreleveurPhysiqueForm
          preleveur={preleveur}
          setPreleveur={setPayload}
        />
      ) : (
        <PreleveurMoralForm
          preleveur={preleveur}
          setPreleveur={setPayload}
        />
      )}
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
      {validationErrors?.length > 0 && (
        <div className='text-center p-5 text-red-500'>
          <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
          {validationErrors.map(err => (
            <p key={err.message}>{err.message}</p>
          )
          )}
        </div>
      )}
      <div className='w-full flex justify-center p-5 mb-8'>
        <Button onClick={handleSubmit}>
          Valider l’édition du préleveur
        </Button>
      </div>
    </div>
  )
}

export default PreleveurEditionForm
