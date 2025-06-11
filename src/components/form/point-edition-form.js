'use client'

import {useState} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material'
import {useRouter} from 'next/navigation'

import {editPointPrelevement, deletePointPrelevement} from '@/app/api/points-prelevement.js'
import PointForm from '@/components/form/point-form.js'
import {getCommuneFromCoords} from '@/lib/communes.js'
import {emptyStringToNull} from '@/utils/string.js'

const PointEditionForm = ({pointPrelevement, bnpeList, mesoList, meContinentalesBvList}) => {
  const router = useRouter()
  const [payload, setPayload] = useState({})
  const point = {...pointPrelevement}
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState()

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

  const handleDeletePoint = async () => {
    setError(null)

    try {
      await deletePointPrelevement(point.id_point)
      router.push('/prelevements')
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
      <div className='border border-red-500 rounded-sm p-5'>
        <div className='text-red-500'>
          <InfoOutlined className='mr-3' />
          Action sensible : Supprimer le point de prélèvement
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
          <DialogTitle><InfoOutlined className='mr-3' />Confirmer la suppression du point de prélèvement</DialogTitle>
          <DialogContent>
            Êtes-vous sûr de vouloir supprimer ce point de prélèvement ? Cette action est irréversible.
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
              onClick={handleDeletePoint}
            >
              Supprimer le point de prélèvement
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      {error && (
        <div className='text-center p-5 pt-10 text-red-500'>
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
      <div className='w-full flex justify-center p-5 my-5'>
        <Button onClick={handleSubmit}>
          Valider les modifications sur le point de prélèvement {point.nom}
        </Button>
      </div>
    </div>
  )
}

export default PointEditionForm
