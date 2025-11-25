/* eslint-disable camelcase */

'use client'

import {useEffect, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {Typography} from '@mui/material'
import {format} from 'date-fns'
import {useRouter} from 'next/navigation'

import {createDocument} from '@/app/api/points-prelevement.js'
import DocumentForm from '@/components/form/document-form.js'
import FormErrors from '@/components/ui/FormErrors/index.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import useFormSubmit from '@/hook/use-form-submit.js'
import {emptyStringToNull} from '@/utils/string.js'

const DocumentUploadForm = ({preleveur}) => {
  const router = useRouter()
  const {isSubmitting, error, validationErrors, resetErrors, withSubmit} = useFormSubmit()

  const [filesList, setFilesList] = useState()
  const [document, setDocument] = useState()
  const [uploadMessage, setUploadMessage] = useState()

  const handleDocument = withSubmit(
    async () => {
      const cleanedDocument = emptyStringToNull(document)
      return createDocument(preleveur._id, cleanedDocument, filesList[0])
    },
    {
      successIndicator: '_id',
      onSuccess: () => router.push(`/preleveurs/${preleveur.id_preleveur}`)
    }
  )

  useEffect(() => {
    if (filesList && filesList.length > 0) {
      setDocument(prev => ({
        ...prev,
        nom_fichier: filesList[0].name,
        date_ajout: format(new Date(), 'yyyy-MM-dd')
      }))
    }
  }, [filesList])

  const isDisabled = !(document?.date_signature
    && document?.nature
    && filesList?.length > 0)

  return (
    <div className='p-3 m-3 border'>
      <Typography variant='h5'>
        Associer un document
      </Typography>
      <div>
        {isSubmitting ? (
          <div className='flex p-5 my-5 justify-center'>
            <SimpleLoading />
          </div>
        ) : (
          <div className='flex p-5 my-5 justify-between'>
            <Upload
              hint='Format PDF, max 50MB, plusieurs fichiers possibles'
              label='Ajout de fichiers'
              nativeInputProps={{
                onChange: e => setFilesList(e.target.files)
              }}
            />
          </div>
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
          Associer au préleveur
        </Button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
