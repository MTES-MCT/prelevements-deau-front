'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert} from '@mui/material'
import {useRouter} from 'next/navigation'

import PointForm from '@/components/form/point-form.js'
import {
  createZonePointPrelevementAction,
  updateZonePointPrelevementAction
} from '@/server/actions/zones.js'
import {emptyStringToNull} from '@/utils/string.js'

function getEditablePointFields(point = {}) {
  const editable = {...point}

  for (const key of [
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'zones',
    'declarants',
    'preleveurs',
    'usages',
    'right'
  ]) {
    delete editable[key]
  }

  return editable
}

const ZonePointForm = ({zone, point = null, mode = 'create', zoneGeometry = null}) => {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const [draft, setDraft] = useState(() => (isEdit ? {} : {
    name: '',
    waterBodyType: '',
    geometryPrecision: ''
  }))
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const visiblePoint = useMemo(
    () => isEdit ? {...getEditablePointFields(point), ...draft} : draft,
    [draft, isEdit, point]
  )

  const isDisabled = isSubmitting || (!isEdit && !(visiblePoint.name && visiblePoint.waterBodyType && visiblePoint.coordinates))

  const handleSetPoint = updater => {
    setError(null)
    setValidationErrors([])
    setDraft(previous => typeof updater === 'function' ? updater(previous) : updater)
  }

  const handleSetGeom = coordinates => {
    setError(null)
    setValidationErrors([])
    setDraft(previous => ({...previous, coordinates}))
  }

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])
    setIsSubmitting(true)

    try {
      const payload = emptyStringToNull(isEdit ? draft : visiblePoint)

      if (isEdit && Object.keys(payload).length === 0) {
        router.push(`/zones/${zone.id}/points-prelevement`)
        return
      }

      const response = isEdit
        ? await updateZonePointPrelevementAction(zone.id, point.id, payload)
        : await createZonePointPrelevementAction(zone.id, payload)

      if (!response.success) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.error)
        }

        return
      }

      router.push(`/zones/${zone.id}/points-prelevement`)
      router.refresh()
    } catch (error_) {
      setError(error_.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Alert severity='info' className='fr-mb-4w'>
        Les coordonnées du point doivent se situer dans la zone « {zone.name} ». Si vous déplacez le point hors de cette zone, l’API refusera l’enregistrement.
      </Alert>

      <PointForm
        point={visiblePoint}
        setPoint={handleSetPoint}
        handleSetGeom={handleSetGeom}
        boundaryFeature={zoneGeometry}
      />

      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}

      {validationErrors?.length > 0 && (
        <div className='text-center p-5 text-red-500'>
          <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
          {validationErrors.map(validationError => (
            <p key={validationError.message}>{validationError.message}</p>
          ))}
        </div>
      )}

      <div className='w-full flex flex-wrap justify-center gap-3 p-5 mb-8'>
        <Button priority='secondary' linkProps={{href: `/zones/${zone.id}/points-prelevement`}}>
          Annuler
        </Button>
        <Button disabled={isDisabled} onClick={handleSubmit}>
          {isSubmitting
            ? 'Enregistrement...'
            : (isEdit ? 'Enregistrer le point de prélèvement' : 'Créer le point de prélèvement')}
        </Button>
      </div>
    </div>
  )
}

export default ZonePointForm
