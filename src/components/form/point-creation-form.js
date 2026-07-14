'use client'

import {useEffect, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import Button from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'

import PointForm from '@/components/form/point-form.js'
import {createPointPrelevementAction} from '@/server/actions/points-prelevement.js'
import {emptyStringToNull} from '@/utils/string.js'

const PointCreationForm = () => {
  const router = useRouter()
  const [point, setPoint] = useState({
    name: '',
    flowType: '',
    waterBodyType: '',
    geometryPrecision: ''
  })
  const [isDisabled, setIsDisabled] = useState(true)
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    try {
      const cleanedPoint = emptyStringToNull(point)
      const result = await createPointPrelevementAction(cleanedPoint)

      if (result.success) {
        router.push(`/points-prelevement/${result.data.id}`)
      } else if (result.validationErrors) {
        setValidationErrors(result.validationErrors)
      } else {
        setError(result.error)
      }
    } catch (error_) {
      setError(error_.message)
    }
  }

  const handleSetGeom = coordinates => {
    setError(null)
    setPoint(prev => ({...prev, coordinates}))
  }

  useEffect(() => {
    setIsDisabled(!(point.name && point.flowType && point.waterBodyType && point.coordinates))
  }, [point])

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        Création d&apos;un point de prélèvement
      </Typography>

      <PointForm
        point={point}
        setPoint={setPoint}
        handleSetGeom={handleSetGeom}
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
          {validationErrors.map(err => (
            <p key={err.message}>{err.message}</p>
          ))}
        </div>
      )}

      <div className='w-full flex justify-center p-5 mb-8'>
        <Button disabled={isDisabled} onClick={handleSubmit}>
          Valider la création du point de prélèvement
        </Button>
      </div>
    </div>
  )
}

export default PointCreationForm
