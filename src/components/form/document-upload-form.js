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

const DocumentUploadForm = ({preleveur, exploitations = []}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [filesList, setFilesList] = useState(null)
  const [document, setDocument] = useState()
  const [uploadMessage, setUploadMessage] = useState()
  const [selectedExploitations, setSelectedExploitations] = useState([])

  const declarantId = preleveur.userId || preleveur.id

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations),
    [exploitations]
  )

  const handleExploitationsChange = exploitationIds => {
    setSelectedExploitations(exploitationIds.slice(-1))
  }

  const handleDocument = withSubmit(
    async () => {
      const cleanedDocument = emptyStringToNull({
        ...document,
        declarantPointPrelevementId: selectedExploitations[0] || null
      })
      const response = await createDocumentAction(declarantId, cleanedDocument, filesList[0])

      if (!response.success) {
        throw response
      }

      return response.data
    },
    {
      successIndicator: 'id',
      onSuccess: () => router.push(`/declarants/${declarantId}`)
    }
  )

  useEffect(() => {
    if (filesList && filesList.length > 0) {
      setDocument(previous => ({
        ...previous,
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

      {exploitations.length > 0 && (
        <DividerSection title='Exploitation associée'>
          <GroupedMultiselect
            searchable
            label='Associer à une exploitation'
            hint='Un document peut être associé à une exploitation.'
            placeholder='Sélectionner une exploitation'
            options={exploitationOptions}
            value={selectedExploitations}
            onChange={handleExploitationsChange}
          />
        </DividerSection>
      )}

      <FormErrors
        error={error}
        validationErrors={validationErrors}
        onClose={resetErrors}
      />

      <div className='flex justify-end'>
        <Button
          className='my-5'
          disabled={isDisabled || isSubmitting}
          onClick={handleDocument}
        >
          Associer au déclarant
        </Button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
