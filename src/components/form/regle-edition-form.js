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

import RegleForm from '@/components/form/regle-form.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
import {parameterUnits} from '@/lib/regles.js'
import {updateRegleAction, deleteRegleAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

function dateToInputValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function isUnitRequired(parameter) {
  return (parameterUnits[parameter] || []).length > 0
}

const transformRegleForForm = regle => ({
  exploitationIds: regle.exploitationIds || regle.exploitations?.map(exploitation => exploitation.id || exploitation) || [],
  documentId: regle.document?.id || regle.documentId || null,
  parameter: regle.parameter || '',
  frequency: regle.frequency || '',
  unit: regle.unit || '',
  value: regle.value ?? '',
  constraint: regle.constraint || '',
  validityStartDate: dateToInputValue(regle.validityStartDate),
  validityEndDate: dateToInputValue(regle.validityEndDate),
  annualPeriodStartDate: dateToInputValue(regle.annualPeriodStartDate),
  annualPeriodEndDate: dateToInputValue(regle.annualPeriodEndDate),
  comment: regle.comment || ''
})

const RegleEditionForm = ({preleveur, regle, exploitations, documents}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit, setError} = useFormSubmit()

  const [formData, setFormData] = useState(transformRegleForForm(regle))
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isFrequencyRequired = formData.parameter === 'volume prélevé'
  const declarantId = preleveur.userId || preleveur.id

  const isFormValid = formData.exploitationIds?.length > 0
    && formData.parameter
    && formData.value !== ''
    && formData.constraint
    && formData.validityStartDate
    && (!isUnitRequired(formData.parameter) || formData.unit)
    && (!isFrequencyRequired || formData.frequency)

  const handleSubmit = withSubmit(
    async () => {
      const payload = emptyStringToNull({
        ...formData,
        value: Number(formData.value)
      })
      const response = await updateRegleAction(regle.id, payload)
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

  const handleDelete = async () => {
    resetErrors()
    setIsDeleting(true)

    try {
      const response = await deleteRegleAction(regle.id, declarantId)

      if (response.success) {
        router.push(`/declarants/${declarantId}`)
      } else {
        setError(response.error)
        setIsDialogOpen(false)
      }
    } catch (error_) {
      setError(error_.message)
      setIsDialogOpen(false)
    } finally {
      setIsDeleting(false)
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
            <p className='mt-3'>Cette action est irréversible.</p>
          </DialogContent>
          <DialogActions className='m-3'>
            <Button
              priority='secondary'
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={isDeleting}
              style={{backgroundColor: 'red'}}
              onClick={handleDelete}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer cette règle'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <FormErrors
        error={error}
        validationErrors={validationErrors.filter(error => !error.path)}
        onClose={resetErrors}
      />

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
