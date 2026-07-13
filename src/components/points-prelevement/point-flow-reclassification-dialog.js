'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {getPointFlowTypeLabel} from '@/lib/point-flow-types.js'

const PointFlowReclassificationDialog = ({details, onCancel, onConfirm, open}) => {
  const valuesCount = Number(details?.valueCount ?? 0)
  const chunksCount = Number(details?.chunkCount ?? 0)

  return (
    <Dialog fullWidth maxWidth='sm' open={open} onClose={onCancel}>
      <DialogTitle>Confirmer le changement de type de point</DialogTitle>
      <DialogContent>
        <p>
          Ce point deviendra un point de {getPointFlowTypeLabel(details?.nextFlowType).toLocaleLowerCase('fr-FR')}.
          Les données déjà rattachées seront requalifiées de la même manière.
        </p>
        <p className='fr-text--sm fr-mb-0 text-gray-700'>
          {chunksCount} série{chunksCount > 1 ? 's' : ''} et {valuesCount} valeur{valuesCount > 1 ? 's' : ''} concernée{valuesCount > 1 ? 's' : ''}.
        </p>
      </DialogContent>
      <DialogActions className='m-3'>
        <Button priority='secondary' onClick={onCancel}>Annuler</Button>
        <Button onClick={onConfirm}>Confirmer et requalifier</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PointFlowReclassificationDialog
