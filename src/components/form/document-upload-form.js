'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {useRouter} from 'next/navigation'

import DocumentForm from '@/components/form/document-form.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import FileDropzone from '@/components/ui/FileDropzone/index.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
import {formatDateRange} from '@/lib/format-date.js'
import {createDocumentAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

function getExploitationLabel(exploitation) {
  const pointName = exploitation.point?.name || exploitation.pointPrelevement?.name || 'Point inconnu'
  const period = formatDateRange(exploitation.startDate, exploitation.endDate)

  return `${pointName}${period ? ` — ${period}` : ''}`
}

const DocumentUploadForm = ({preleveur, exploitations = []}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [filesList, setFilesList] = useState(null)
  const [document, setDocument] = useState({})
  const [uploadMessage, setUploadMessage] = useState()
  const [selectedExploitationId, setSelectedExploitationId] = useState('')

  const declarantId = preleveur.userId || preleveur.id

  const exploitationOptions = useMemo(() => [
    {value: '', label: '-- Aucun rattachement à une exploitation --'},
    ...exploitations.map(exploitation => ({
      value: exploitation.id,
      label: getExploitationLabel(exploitation)
    }))
  ], [exploitations])

  const handleDocument = withSubmit(
    async () => {
      const cleanedDocument = emptyStringToNull({
        ...document,
        declarantPointPrelevementId: selectedExploitationId || null
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
          <Select
            label='Associer à une exploitation'
            hint='Optionnel : utile si le document concerne une exploitation précise.'
            nativeSelectProps={{
              value: selectedExploitationId,
              onChange: event => setSelectedExploitationId(event.target.value)
            }}
            options={exploitationOptions}
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
