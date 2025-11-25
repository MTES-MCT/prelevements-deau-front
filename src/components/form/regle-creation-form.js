/* eslint-disable camelcase */
'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {useRouter} from 'next/navigation'

import {createRegle} from '@/app/api/points-prelevement.js'
import RegleForm from '@/components/form/regle-form.js'
import {emptyStringToNull} from '@/utils/string.js'

const emptyRegle = {
  exploitations: [],
  document: null,
  parametre: '',
  unite: '',
  valeur: '',
  contrainte: '',
  debut_validite: '',
  fin_validite: '',
  debut_periode: '',
  fin_periode: '',
  remarque: ''
}

const RegleCreationForm = ({preleveur, exploitations, documents}) => {
  const router = useRouter()

  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [regle, setRegle] = useState(emptyRegle)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = regle.exploitations?.length > 0
    && regle.parametre
    && regle.unite
    && regle.valeur !== ''
    && regle.contrainte
    && regle.debut_validite

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])
    setIsSubmitting(true)

    try {
      const payload = emptyStringToNull({
        ...regle,
        valeur: Number(regle.valeur)
      })

      const response = await createRegle(preleveur._id, payload)

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

  const hasNoExploitations = !exploitations || exploitations.length === 0

  return (
    <div>
      <RegleForm
        regle={regle}
        setRegle={setRegle}
        exploitations={exploitations}
        documents={documents}
        validationErrors={validationErrors}
      />

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

      {!hasNoExploitations && (
        <div className='w-full flex justify-center p-5 mb-8'>
          <Button
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Création en cours...' : 'Créer la règle'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default RegleCreationForm
