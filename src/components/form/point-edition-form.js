'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import Button from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import PointForm from '@/components/form/point-form.js'
import PointFlowReclassificationDialog from '@/components/points-prelevement/point-flow-reclassification-dialog.js'
import {getPointFlowChangeDetails} from '@/lib/point-flow-types.js'
import {editPointPrelevementAction, deletePointPrelevementAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

const PointEditionForm = ({canDelete = false, pointPrelevement}) => {
  const router = useRouter()
  const [payload, setPayload] = useState({})
  const point = {...pointPrelevement}
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [flowChangeDetails, setFlowChangeDetails] = useState(null)

  const handleSubmit = async ({confirmFlowReclassification = false} = {}) => {
    setError(null)
    setValidationErrors([])

    if (Object.keys(payload).length === 0) {
      router.push(`/points-prelevement/${point.id}`)
      return
    }

    try {
      const cleanedPayload = emptyStringToNull({
        ...payload,
        ...(confirmFlowReclassification ? {confirmFlowReclassification: true} : {})
      })
      const response = await editPointPrelevementAction(point.id, cleanedPayload)

      if (response.success) {
        router.push(`/points-prelevement/${response.data.id}`)
      } else if (response.validationErrors) {
        setValidationErrors(response.validationErrors)
      } else {
        const reclassificationDetails = getPointFlowChangeDetails(response)
        if (reclassificationDetails) {
          setFlowChangeDetails(reclassificationDetails)
        } else {
          setError(response.error)
        }
      }
    } catch (error_) {
      setError(error_.message)
    }
  }

  const handleDeletePoint = async () => {
    setError(null)

    try {
      const response = await deletePointPrelevementAction(point.id)

      if (!response.success) {
        setIsDialogOpen(false)
        setError(response.error)
        return
      }

      router.push('/points-prelevement')
    } catch (error_) {
      setError(error_.message)
    }
  }

  const handleSetGeom = coordinates => {
    setError(null)
    setPayload(prev => ({...prev, coordinates}))
  }

  return (
    <div>
      <PointForm
        point={{...point, ...payload}}
        setPoint={setPayload}
        handleSetGeom={handleSetGeom}
      />

      <PointFlowReclassificationDialog
        details={flowChangeDetails}
        open={Boolean(flowChangeDetails)}
        onCancel={() => setFlowChangeDetails(null)}
        onConfirm={() => {
          setFlowChangeDetails(null)
          handleSubmit({confirmFlowReclassification: true})
        }}
      />

      {canDelete && <div className='border border-red-500 rounded-sm p-5'>
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
      </div>}

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
          ))}
        </div>
      )}

      <div className='w-full flex justify-center p-5 my-5'>
        <Button onClick={() => handleSubmit()}>
          Valider les modifications sur le point de prélèvement {point.name}
        </Button>
      </div>
    </div>
  )
}

export default PointEditionForm
