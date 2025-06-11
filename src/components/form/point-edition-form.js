'use client'

import {useState} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {useRouter} from 'next/navigation'

import {editPointPrelevement} from '@/app/api/points-prelevement.js'
import PointForm from '@/components/form/point-form.js'
import {getCommuneFromCoords} from '@/lib/communes.js'
import {emptyStringToNull} from '@/utils/string.js'

const PointEditionForm = ({pointPrelevement, bnpeList, mesoList, meContinentalesBvList}) => {
  const router = useRouter()
  const [payload, setPayload] = useState({})
  const point = {...pointPrelevement}
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    try {
      const cleanedPayload = emptyStringToNull(payload)
      const response = await editPointPrelevement(point.id_point, cleanedPayload)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        router.push(`/prelevements?point-prelevement=${response.id_point}`)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSetGeom = async geom => {
    try {
      const commune = await getCommuneFromCoords(
        {
          lon: geom.coordinates[0],
          lat: geom.coordinates[1]
        }
      )

      if (!commune) {
        setError('Cette commune est introuvable.')
        return
      }

      setPayload(prev => ({...prev, commune: commune.code, geom}))
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        Édition du point de prélèvement {point.nom}
      </Typography>
      <PointForm
        point={point}
        setPoint={setPayload}
        handleSetGeom={handleSetGeom}
        bnpeList={bnpeList}
        meContinentalesBvList={meContinentalesBvList}
        mesoList={mesoList}
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
          )
          )}
        </div>
      )}
      <div className='w-full flex justify-center p-5 mb-8'>
        <Button onClick={handleSubmit}>
          Valider les modifications sur le point de prélèvement {point.nom}
        </Button>
      </div>
    </div>
  )
}

export default PointEditionForm
