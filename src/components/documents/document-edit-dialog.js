'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {updateDocument, updateExploitation} from '@/app/api/points-prelevement.js'
import DocumentForm from '@/components/form/document-form.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {emptyStringToNull} from '@/utils/string.js'

// Build a map from exploitation ID to display label (point name only)
const buildExploitationLabelsMap = exploitations => {
  const map = {}
  for (const exploitation of exploitations) {
    const pointName = exploitation.point?.nom || exploitation.point?.id_point || 'Point inconnu'
    map[exploitation._id] = pointName
  }

  return map
}

// Build reverse map from label to ID
const buildIdByLabelMap = labelsById => {
  const idByLabel = {}
  for (const [id, label] of Object.entries(labelsById)) {
    idByLabel[label] = id
  }

  return idByLabel
}

// Group exploitations by statut for the multiselect
const buildExploitationOptions = (exploitations, labelsById) => {
  const statutOrder = ['En activité', 'Terminée', 'Abandonnée', 'Non renseigné']
  const grouped = {}

  for (const exploitation of exploitations) {
    const statut = exploitation.statut || 'Non renseigné'
    grouped[statut] ||= []

    const label = labelsById[exploitation._id]
    const dateText = `Depuis le ${formatFullDateFr(exploitation.date_debut)}${exploitation.date_fin ? ` jusqu'au ${formatFullDateFr(exploitation.date_fin)}` : ''}`

    grouped[statut].push({
      value: label,
      content: label,
      title: dateText
    })
  }

  // Return groups in order, filtering out empty groups
  return statutOrder
    .filter(statut => grouped[statut]?.length > 0)
    .map(statut => ({
      label: statut,
      options: grouped[statut]
    }))
}

const DocumentEditDialog = ({
  document,
  exploitations,
  isOpen,
  onClose,
  onDocumentUpdated,
  onExploitationsUpdated
}) => {
  const [payload, setPayload] = useState({})
  const [selectedExploitations, setSelectedExploitations] = useState([])
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Build ID <-> label mappings
  const exploitationLabelsById = useMemo(
    () => buildExploitationLabelsMap(exploitations),
    [exploitations]
  )

  const idByLabel = useMemo(
    () => buildIdByLabelMap(exploitationLabelsById),
    [exploitationLabelsById]
  )

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations, exploitationLabelsById),
    [exploitations, exploitationLabelsById]
  )

  // Initialize selected exploitations when dialog opens
  useMemo(() => {
    if (isOpen && document && !isInitialized) {
      const currentExploitationIds = exploitations
        .filter(e => e.documents?.some(d => (d._id || d) === document._id))
        .map(e => e._id)
      setSelectedExploitations(currentExploitationIds)
      setPayload({})
      setError(null)
      setValidationErrors([])
      setIsInitialized(true)
    } else if (!isOpen) {
      setIsInitialized(false)
    }
  }, [isOpen, document, exploitations, isInitialized])

  // Convert selected IDs to display labels for the multiselect
  const selectedLabels = useMemo(() =>
    selectedExploitations.map(id => exploitationLabelsById[id] || id),
  [selectedExploitations, exploitationLabelsById])

  // Handle selection change - convert labels back to IDs
  const handleExploitationsChange = newLabels => {
    const newIds = newLabels.map(label => idByLabel[label] || label)
    setSelectedExploitations(newIds)
  }

  const handleSave = async () => {
    setError(null)
    setValidationErrors([])

    try {
      let updatedDocument = document

      // Update document metadata if changed
      if (Object.keys(payload).length > 0) {
        const cleanedPayload = emptyStringToNull(payload)
        const response = await updateDocument(document._id, cleanedPayload)

        if (response.code === 400) {
          if (response.validationErrors) {
            setValidationErrors(response.validationErrors)
          } else {
            setError(response.message)
          }

          return
        }

        updatedDocument = response
        onDocumentUpdated(updatedDocument)
      }

      // Update exploitations assignments
      const currentExploitationIds = exploitations
        .filter(e => e.documents?.some(d => (d._id || d) === document._id))
        .map(e => e._id)

      const toAdd = selectedExploitations.filter(id => !currentExploitationIds.includes(id))
      const toRemove = currentExploitationIds.filter(id => !selectedExploitations.includes(id))

      // Add document to new exploitations
      const addPromises = toAdd.map(async exploitationId => {
        const exploitation = exploitations.find(e => e._id === exploitationId)
        const currentDocIds = exploitation.documents?.map(d => d._id || d) || []
        const updatedDocIds = [...currentDocIds, document._id]

        return updateExploitation(exploitationId, {documents: updatedDocIds})
      })

      // Remove document from unselected exploitations
      const removePromises = toRemove.map(async exploitationId => {
        const exploitation = exploitations.find(e => e._id === exploitationId)
        const updatedDocIds = exploitation.documents
          ?.map(d => d._id || d)
          .filter(id => id !== document._id) || []

        return updateExploitation(exploitationId, {documents: updatedDocIds})
      })

      await Promise.all([...addPromises, ...removePromises])

      // Notify parent of exploitation changes
      onExploitationsUpdated(toAdd, toRemove, document._id)

      onClose()
    } catch (error_) {
      setError(error_.message)
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
        Édition du document : {document.nom_fichier}
      </DialogTitle>
      <DialogContent>
        <DocumentForm
          document={document}
          setDocument={setPayload}
        />

        {/* Exploitations selection */}
        {exploitations.length > 0 && (
          <div className='mt-4'>
            <GroupedMultiselect
              hint='Sélectionnez les exploitations auxquelles ce document est lié'
              label='Exploitations associées'
              options={exploitationOptions}
              placeholder='Sélectionner des exploitations'
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
