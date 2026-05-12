'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import DocumentForm from '@/components/form/document-form.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {updateDocumentAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

const statusLabels = {
  EN_ACTIVITE: 'En activité',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
  NON_RENSEIGNE: 'Non renseigné'
}

const buildExploitationLabelsMap = exploitations => {
  const map = {}

  for (const exploitation of exploitations) {
    const pointName = exploitation.point?.name || exploitation.pointPrelevement?.name || 'Point inconnu'
    const label = `${pointName}${exploitation.type ? ` — ${exploitation.type}` : ''}`
    map[exploitation.id] = label
  }

  return map
}

const buildIdByLabelMap = labelsById => Object.fromEntries(
  Object.entries(labelsById).map(([id, label]) => [label, id])
)

const buildExploitationOptions = (exploitations, labelsById) => {
  const statusOrder = ['EN_ACTIVITE', 'TERMINEE', 'ABANDONNEE', 'NON_RENSEIGNE']
  const grouped = {}

  for (const exploitation of exploitations) {
    const status = exploitation.status || 'NON_RENSEIGNE'
    grouped[status] ||= []

    const label = labelsById[exploitation.id]
    const dateText = `${exploitation.startDate ? `Depuis le ${formatFullDateFr(exploitation.startDate)}` : 'Début non renseigné'}${exploitation.endDate ? ` jusqu'au ${formatFullDateFr(exploitation.endDate)}` : ''}`

    grouped[status].push({
      value: label,
      content: label,
      title: dateText
    })
  }

  return statusOrder
    .filter(status => grouped[status]?.length > 0)
    .map(status => ({
      label: statusLabels[status] || status,
      options: grouped[status]
    }))
}

const DocumentEditDialog = ({
  declarantId,
  document,
  exploitations,
  isOpen,
  onClose,
  onDocumentUpdated
}) => {
  const [payload, setPayload] = useState({})
  const [selectedExploitations, setSelectedExploitations] = useState([])
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  const exploitationLabelsById = useMemo(
    () => buildExploitationLabelsMap(exploitations || []),
    [exploitations]
  )

  const idByLabel = useMemo(
    () => buildIdByLabelMap(exploitationLabelsById),
    [exploitationLabelsById]
  )

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations || [], exploitationLabelsById),
    [exploitations, exploitationLabelsById]
  )

  useEffect(() => {
    if (isOpen && document) {
      setSelectedExploitations(document.declarantPointPrelevementId ? [document.declarantPointPrelevementId] : [])
      setPayload({})
      setError(null)
      setValidationErrors([])
    }
  }, [isOpen, document])

  const selectedLabels = useMemo(() =>
    selectedExploitations.map(id => exploitationLabelsById[id] || id),
  [selectedExploitations, exploitationLabelsById])

  const handleExploitationsChange = newLabels => {
    const newIds = newLabels.map(label => idByLabel[label] || label)
    setSelectedExploitations(newIds.slice(-1))
  }

  const handleSave = async () => {
    setError(null)
    setValidationErrors([])

    try {
      const cleanedPayload = emptyStringToNull({
        ...payload,
        declarantPointPrelevementId: selectedExploitations[0] || null
      })

      const response = await updateDocumentAction(document.id, cleanedPayload, declarantId)

      if (!response.success) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.error)
        }

        return
      }

      onDocumentUpdated(response.data)
      onClose()
    } catch (error_) {
      setError(error_?.message || 'Une erreur est survenue lors de la sauvegarde')
    }
  }

  const handleClose = () => {
    setPayload({})
    setError(null)
    setValidationErrors([])
    onClose()
  }

  if (!document) {
    return null
  }

  return (
    <Dialog
      maxWidth='md'
      open={isOpen}
      onClose={handleClose}
    >
      <DialogTitle>
        <InfoOutlined className='mr-3' />
        Édition du document : {document.title || document.filename}
      </DialogTitle>
      <DialogContent>
        <DocumentForm
          document={document}
          setDocument={setPayload}
        />

        {exploitations.length > 0 && (
          <div className='mt-4'>
            <GroupedMultiselect
              hint='Un document peut être associé à une exploitation.'
              label='Exploitation associée'
              options={exploitationOptions}
              placeholder='Sélectionner une exploitation'
              value={selectedLabels}
              onChange={handleExploitationsChange}
            />
          </div>
        )}

        {error && (
          <div className='text-center p-5 text-red-500'>
            <p><b>Erreur :</b> {error}</p>
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
      </DialogContent>
      <DialogActions className='m-3'>
        <Button
          priority='secondary'
          onClick={handleClose}
        >
          Annuler
        </Button>
        <Button onClick={handleSave}>
          Valider les modifications
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DocumentEditDialog
