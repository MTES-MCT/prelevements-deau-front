/* eslint-disable camelcase */
'use client'

import {useEffect, useState} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {useRouter} from 'next/navigation'

import {createPointPrelevement} from '@/app/api/points-prelevement.js'
import PointForm from '@/components/form/point-form.js'
import {getCommuneFromCoords} from '@/lib/communes.js'
import {emptyStringToNull} from '@/utils/string.js'

const PointCreationForm = ({
  bnpeList,
  bssList,
  bvBdCarthageList,
  mesoList,
  meContinentalesBvList
}) => {
  const router = useRouter()
  const [point, setPoint] = useState({
    nom: '',
    type_milieu: '',
    precision_geom: ''
  })
  const [isDisabled, setIsDisabled] = useState(true)
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    try {
      const cleanedPoint = emptyStringToNull(point)
      const response = await createPointPrelevement(cleanedPoint)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        router.push(`/points-prelevement/${response.id_point}`)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSetGeom = async geom => {
    setError(null)

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

      setPoint(prev => ({...prev, commune: commune.code, geom}))
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    setIsDisabled(!(point.nom && point.type_milieu && point.geom))
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
        bnpeList={bnpeList}
        bssList={bssList}
        bvBdCarthageList={bvBdCarthageList}
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
        <Button disabled={isDisabled} onClick={handleSubmit}>
          Valider la création du point de prélèvement
        </Button>
      </div>
    </div>
  )
}

export default PointCreationForm
