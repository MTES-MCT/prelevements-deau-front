/* eslint-disable camelcase */
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

import {updateRegle, deleteRegle} from '@/app/api/points-prelevement.js'
import RegleForm from '@/components/form/regle-form.js'
import {emptyStringToNull} from '@/utils/string.js'

/**
 * Transform API regle to form state
 * Converts exploitations from decorated objects to array of IDs
 */
const transformRegleForForm = regle => ({
  exploitations: regle.exploitations?.map(e => e._id || e) || [],
  document: regle.document?._id || regle.document || null,
  parametre: regle.parametre || '',
  unite: regle.unite || '',
  valeur: regle.valeur ?? '',
  contrainte: regle.contrainte || '',
  debut_validite: regle.debut_validite?.split('T')[0] || '',
  fin_validite: regle.fin_validite?.split('T')[0] || '',
  debut_periode: regle.debut_periode?.split('T')[0] || '',
  fin_periode: regle.fin_periode?.split('T')[0] || '',
  remarque: regle.remarque || ''
})

const RegleEditionForm = ({preleveur, regle, exploitations, documents}) => {
  const router = useRouter()

  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [formData, setFormData] = useState(transformRegleForForm(regle))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const isFormValid = formData.exploitations?.length > 0
    && formData.parametre
    && formData.unite
    && formData.valeur !== ''
    && formData.contrainte
    && formData.debut_validite

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])
    setIsSubmitting(true)

    try {
      const payload = emptyStringToNull({
        ...formData,
        valeur: Number(formData.valeur)
      })

      const response = await updateRegle(regle._id, payload)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else if (response._id) {
        router.push(`/preleveurs/${preleveur.id_preleveur}`)
      } else {
        setError('Une erreur inattendue est survenue')
      }
    } catch (error_) {
      setError(error_.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await deleteRegle(regle._id)

      if (response.code) {
        setIsDialogOpen(false)
        setError(response.message)
        return
      }

      router.push(`/preleveurs/${preleveur.id_preleveur}`)
    } catch (error_) {
      setError(error_.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <RegleForm
        regle={formData}
        setRegle={setFormData}
        exploitations={exploitations}
        documents={documents}
        validationErrors={validationErrors}
      />

      <div className='border border-red-500 rounded-sm p-5 mt-6'>
        <div className='text-red-500'>
          <InfoOutlined className='mr-3' />
          Action sensible : Supprimer la règle
        </div>
        <div className='ml-8'>
          Cette action est irréversible.
        </div>
        <div className='ml-8 mt-5'>
          <Button
            priority='secondary'
            style={{
              color: 'red',
              boxShadow: '0 0 0 1px red'
            }}
            onClick={() => setIsDialogOpen(true)}
          >
            Supprimer
          </Button>
        </div>
        <Dialog
          open={isDialogOpen}
          maxWidth='md'
          onClose={() => setIsDialogOpen(false)}
        >
          <DialogTitle>
            <InfoOutlined className='mr-3' />
            Confirmer la suppression de cette règle
          </DialogTitle>
          <DialogContent>
            <p>Êtes-vous sûr de vouloir supprimer cette règle ?</p>
            <p className='mt-3'>
              <strong>Conséquences :</strong>
            </p>
            <ul className='list-disc ml-5 mt-2'>
              <li>Cette règle sera définitivement supprimée.</li>
              <li>Les exploitations associées ne seront plus soumises à cette contrainte.</li>
              <li>Cette action est irréversible.</li>
            </ul>
          </DialogContent>
          <DialogActions className='m-3'>
            <Button
              priority='secondary'
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={isSubmitting}
              style={{backgroundColor: 'red'}}
              onClick={handleDelete}
            >
              Supprimer cette règle
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

      {validationErrors?.length > 0 && !validationErrors.some(e => e.path) && (
        <div className='text-center p-5 text-red-500'>
          <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
          {validationErrors.map(err => (
            <p key={err.message}>{err.message}</p>
          ))}
        </div>
      )}

      <div className='w-full flex justify-center p-5 mb-8'>
        <Button
          disabled={!isFormValid || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  )
}

export default RegleEditionForm
