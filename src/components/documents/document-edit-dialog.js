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

function getExploitationLabel(exploitation) {
  const pointName = exploitation.pointPrelevement?.name || 'Point inconnu'
  const usagesText = exploitation.usages?.length > 0
    ? exploitation.usages.join(', ')
    : 'Usage non renseigné'

  return `${pointName} - ${usagesText}`
}

function getExploitationTooltip(exploitation) {
  const start = exploitation.startDate
    ? `Depuis le ${formatFullDateFr(exploitation.startDate)}`
    : 'Début non renseigné'

  const end = exploitation.endDate
    ? ` jusqu’au ${formatFullDateFr(exploitation.endDate)}`
    : ''

  return `${start}${end}`
}

function buildExploitationOptions(exploitations) {
  const grouped = {}

  for (const exploitation of exploitations) {
    const status = exploitation.status || 'NON_RENSEIGNE'
    grouped[status] ||= []

    const label = getExploitationLabel(exploitation)

    grouped[status].push({
      value: exploitation.id,
      content: label,
      title: label,
      tooltip: getExploitationTooltip(exploitation),
      sortKey: exploitation.pointPrelevement?.name || ''
    })
  }

  for (const options of Object.values(grouped)) {
    options.sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey, 'fr', {sensitivity: 'base'})
    )
  }

  const statusOrder = ['EN_ACTIVITE', 'TERMINEE', 'ABANDONNEE', 'NON_RENSEIGNE']

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

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations || []),
    [exploitations]
  )

  useEffect(() => {
    if (isOpen && document) {
      setSelectedExploitations(document.declarantPointPrelevementId ? [document.declarantPointPrelevementId] : [])
      setPayload({})
      setError(null)
      setValidationErrors([])
    }
  }, [isOpen, document])

  const handleExploitationsChange = exploitationIds => {
    setSelectedExploitations(exploitationIds.slice(-1))
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
              searchable
              hint='Un document peut être associé à une exploitation.'
              label='Exploitation associée'
              options={exploitationOptions}
              placeholder='Sélectionner une exploitation'
              value={selectedExploitations}
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
