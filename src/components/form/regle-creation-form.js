'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Button} from '@codegouvfr/react-dsfr/Button'

import RegleForm from '@/components/form/regle-form.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
import {parameterUnits} from '@/lib/regles.js'
import {createRegleAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

const emptyRegle = {
  exploitationIds: [],
  documentId: null,
  parameter: '',
  unit: '',
  value: '',
  constraint: '',
  frequency: null,
  validityStartDate: '',
  validityEndDate: '',
  annualPeriodStartDate: '',
  annualPeriodEndDate: '',
  comment: ''
}

function isUnitRequired(parameter) {
  return (parameterUnits[parameter] || []).length > 0
}

const RegleCreationForm = ({preleveur, exploitations = [], documents = []}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [regle, setRegle] = useState(emptyRegle)

  const declarantId = preleveur.userId || preleveur.id
  const isFrequencyRequired = regle.parameter === 'volume'

  const isFormValid = regle.exploitationIds?.length > 0
    && regle.parameter
    && regle.value !== ''
    && regle.constraint
    && regle.validityStartDate
    && (!isUnitRequired(regle.parameter) || regle.unit)
    && (!isFrequencyRequired || regle.frequency)

  const handleSubmit = withSubmit(
    async () => {
      const payload = emptyStringToNull({
        ...regle,
        value: Number(regle.value)
      })

      const response = await createRegleAction(declarantId, payload)

      if (!response.success) {
        throw response
      }

      return response.data
    },
    {
      successIndicator: 'id',
      onSuccess: () => router.push(`/declarants/${declarantId}`)
    }
  )

  const hasNoExploitations = exploitations.length === 0

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
        validationErrors={validationErrors.filter(error => !error.path)}
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
