
'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {useRouter} from 'next/navigation'

import DocumentForm from '@/components/form/document-form.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import FileDropzone from '@/components/ui/FileDropzone/index.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {createDocumentAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

// Build a map from exploitation ID to display label (point name only)
const buildExploitationLabelsMap = exploitations => {
  const map = {}
  for (const exploitation of exploitations) {
    const pointName = exploitation.point?.name || exploitation.pointPrelevement?.name || 'Point inconnu'
    map[exploitation.id] = pointName
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
  const statutOrder = ['EN_ACTIVITE', 'TERMINEE', 'ABANDONNEE', 'NON_RENSEIGNE']
  const statusLabels = {
    EN_ACTIVITE: 'En activité',
    TERMINEE: 'Terminée',
    ABANDONNEE: 'Abandonnée',
    NON_RENSEIGNE: 'Non renseigné'
  }
  const grouped = {}

  for (const exploitation of exploitations) {
    const statut = exploitation.status || 'NON_RENSEIGNE'
    grouped[statut] ||= []

    const label = labelsById[exploitation.id]
    const dateText = `Depuis le ${formatFullDateFr(exploitation.startDate)}${exploitation.endDate ? ` jusqu'au ${formatFullDateFr(exploitation.endDate)}` : ''}`

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
      label: statusLabels[statut] || statut,
      options: grouped[statut]
    }))
}

const DocumentUploadForm = ({preleveur, exploitations = []}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [filesList, setFilesList] = useState(null)
  const [document, setDocument] = useState()
  const [uploadMessage, setUploadMessage] = useState()
  const [selectedExploitations, setSelectedExploitations] = useState([])
  const [assignmentWarning, setAssignmentWarning] = useState(null)

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

  // Convert selected IDs to display labels for the multiselect
  const selectedLabels = useMemo(() =>
    selectedExploitations.map(id => exploitationLabelsById[id] || id),
  [selectedExploitations, exploitationLabelsById])

  // Handle selection change - convert labels back to IDs
  const handleExploitationsChange = newLabels => {
    const newIds = newLabels.map(label => idByLabel[label] || label)
    setSelectedExploitations(newIds)
  }

  const handleDocument = withSubmit(
    async () => {
      const cleanedDocument = emptyStringToNull({
        ...document,
        declarantPointPrelevementId: selectedExploitations[0] || null
      })
      const response = await createDocumentAction(preleveur.userId || preleveur.id, cleanedDocument, filesList[0])

      if (!response.success) {
        throw response
      }

      const createdDoc = response.data
      if (selectedExploitations.length > 1) {
        const results = [{status: 'rejected', reason: new Error('Un document ne peut être associé qu’à une exploitation à la création. Créez un second document pour les autres exploitations.')}]
        const assignmentErrors = results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason?.message)

        if (assignmentErrors.length > 0) {
          setAssignmentWarning(
            `Le document a été créé mais n'a pas pu être assigné aux exploitations suivantes : ${assignmentErrors.join(', ')}`
          )
        }
      }

      return createdDoc
    },
    {
      successIndicator: 'id',
      onSuccess: () => router.push(`/declarants/${preleveur.userId || preleveur.id}`)
    }
  )

  useEffect(() => {
    if (filesList && filesList.length > 0) {
      setDocument(prev => ({
        ...prev,
        title: filesList[0].name
      }))
    }
  }, [filesList])

  const isDisabled = !(document?.signatureDate
    && document?.nature
    && filesList?.length > 0)

  return (
    <div>
      <div className='my-5'>
        {isSubmitting ? (
          <div className='flex p-5 justify-center'>
            <SimpleLoading />
          </div>
        ) : (
          <FileDropzone
            accept='.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods'
            hint='Format PDF - Max 50MB'
            label='Glissez-déposez votre fichier ici *'
            value={filesList}
            onChange={setFilesList}
          />
        )}
      </div>
      {uploadMessage && (
        <Alert
          closable
          className='my-5'
          severity={uploadMessage.type}
          description={uploadMessage.message}
          onClose={() => setUploadMessage(null)}
        />
      )}
      <DocumentForm
        document={document}
        setDocument={setDocument}
      />

      {/* Exploitations selection */}
      {exploitations.length > 0 && (
        <DividerSection title='Exploitations associées'>
          <GroupedMultiselect
            label='Associer à des exploitations'
            hint='Sélectionnez les exploitations auxquelles ce document est lié (optionnel)'
            placeholder='Sélectionner des exploitations'
            options={exploitationOptions}
            value={selectedLabels}
            onChange={handleExploitationsChange}
          />
        </DividerSection>
      )}

      <FormErrors
        error={error}
        validationErrors={validationErrors}
        onClose={resetErrors}
      />
      {assignmentWarning && (
        <Alert
          closable
          className='my-5'
          severity='warning'
          title='Assignation partielle'
          description={assignmentWarning}
          onClose={() => setAssignmentWarning(null)}
        />
      )}
      <div className='flex justify-end'>
        <Button
          className='my-5'
          disabled={isDisabled || isSubmitting}
          onClick={handleDocument}
        >
          Associer au préleveur
        </Button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
