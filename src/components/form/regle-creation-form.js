/* eslint-disable camelcase */
'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {useRouter} from 'next/navigation'

import {createRegle} from '@/app/api/points-prelevement.js'
import RegleForm from '@/components/form/regle-form.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
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
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [regle, setRegle] = useState(emptyRegle)

  // Parameters that require a unit selection
  const parametresRequiringUnite = ['Débit prélevé', 'Débit réservé']
  const isUniteRequired = parametresRequiringUnite.includes(regle.parametre)

  const isFormValid = regle.exploitations?.length > 0
    && regle.parametre
    && regle.valeur !== ''
    && regle.contrainte
    && regle.debut_validite
    && (!isUniteRequired || regle.unite)

  const handleSubmit = withSubmit(
    async () => {
      const payload = emptyStringToNull({
        ...regle,
        valeur: Number(regle.valeur)
      })
      return createRegle(preleveur._id, payload)
    },
    {
      successIndicator: '_id',
      onSuccess: () => router.push(`/preleveurs/${preleveur.id_preleveur}`)
    }
  )

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

      <FormErrors
        error={error}
        validationErrors={validationErrors.filter(e => !e.path)}
        onClose={resetErrors}
      />

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
