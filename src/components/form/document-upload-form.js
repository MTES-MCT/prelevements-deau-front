/* eslint-disable camelcase */

'use client'

import {useEffect, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {Typography} from '@mui/material'
import {format} from 'date-fns'
import {useRouter} from 'next/navigation'

import SimpleLoading from '../ui/simple-loading.js'

import {createDocument, uploadDocument} from '@/app/api/points-prelevement.js'
import {emptyStringToNull} from '@/utils/string.js'

const naturesDocument = [
  'Autorisation AOT',
  'Autorisation CSP',
  'Autorisation CSP - IOTA',
  'Autorisation hydroélectricité',
  'Autorisation ICPE',
  'Autorisation IOTA',
  'Délibération abandon',
  'Rapport hydrogéologue agréé'
]

const DocumentUploadForm = ({idPreleveur}) => {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [isDisabled, setIsDisabled] = useState(true)
  const [filesList, setFilesList] = useState()
  const [document, setDocument] = useState()
  const [uploadMessage, setUploadMessage] = useState()
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  const handleDocument = async () => {
    setError(null)
    setValidationErrors([])
    setIsLoading(true)

    try {
      const cleanedDocument = emptyStringToNull(document)
      const response = await createDocument(idPreleveur, cleanedDocument)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        const uploadResponse = await uploadDocument(idPreleveur, filesList[0])
        if (uploadResponse.nom) {
          router.push(`/preleveurs/${idPreleveur}`)
        } else {
          setError(uploadResponse.message)
        }
      }
    } catch (error) {
      setError(error.message)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (filesList && filesList.length > 0) {
      setDocument(prev => ({
        ...prev,
        nom_fichier: filesList[0].name,
        date_ajout: format(new Date(), 'yyyy-MM-dd')
      }))
    }
  }, [filesList])

  useEffect(() => {
    setIsDisabled(
      !(document?.date_signature
        && document?.nature
        && filesList.length > 0)
    )
  }, [document, filesList])

  return (
    <div className='p-3 m-3 border'>
      <Typography variant='h5'>
        Associer un document
      </Typography>
      <div>
        {isLoading ? (
          <div className='flex p-5 my-5 justify-center'>
            <SimpleLoading />
          </div>
        ) : (
          <div className='flex p-5 my-5 justify-between'>
            <Upload
              hint='Format PDF, max 50MB, plusieurs fichiers possible'
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
      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Référence'
          nativeInputProps={{
            onChange: e => setDocument(prev => ({...prev, reference: e.target.value}))
          }}
        />
        <Select
          label='Nature'
          placeholder='Sélectionner la nature du document'
          nativeSelectProps={{
            onChange: e => setDocument(prev => ({...prev, nature: e.target.value}))
          }}
          options={naturesDocument.map(nature => ({
            value: nature,
            label: nature
          }))}
        />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Date de signature'
          nativeInputProps={{
            type: 'date',
            onChange: e => setDocument(prev => ({...prev, date_signature: e.target.value}))
          }}
        />
        <Input
          label='Date de fin de validité'
          nativeInputProps={{
            type: 'date',
            onChange: e => setDocument(prev => ({...prev, date_fin_validite: e.target.value}))
          }}
        />
      </div>
      <Input
        textArea
        label='Remarque'
        nativeTextAreaProps={{
          onChange: e => setDocument(prev => ({...prev, remarque: e.target.value}))
        }}
      />
      {error && (
        <div className='text-center p-5 text-red-500'>
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
      <div className='flex justify-end'>
        <Button
          className='my-5'
          disabled={isDisabled}
          onClick={handleDocument}
        >
          Associer au préleveur
        </Button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
