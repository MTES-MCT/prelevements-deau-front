'use client'

import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {validateMultiParamFile, validateCamionCiterneFile} from '@fabnum/prelevements-deau-timeseries-parsers'
import {
  Button, Card, CardContent, CircularProgress, Typography, useEventCallback
} from '@mui/material'

import FileValidationErrors from '@/components/declarations/file-validation-errors.js'

const FileValidateurForm = () => {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('Données standardisées')
  const [fileErrors, setFileErrors] = useState(null)
  const [inputError, setInputError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const submit = async () => {
    setIsLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const validation = fileType === 'Données standardisées' ? validateMultiParamFile : validateCamionCiterneFile
      const {errors} = await validation(buffer)

      setFileErrors(errors)
    } catch (error) {
      console.error('Erreur lors de la validation du fichier:', error)
    }

    setIsLoading(false)
  }

  const handleFileChange = useEventCallback(event => {
    const file = event.target.files[0]
    if (file.size > 10 * 1024 * 1024) { // 10 Mo
      setInputError('Le fichier dépasse la taille maximale autorisée (10 Mo)')
    } else {
      setInputError(null)
      setFileErrors(null)
      setFile(file)
    }
  }, [])

  const handleFileTypeChange = useEventCallback(event => {
    setFileType(event.target.value)
    setFileErrors(null)
    setInputError(null)
  }, [])

  return (
    <div className='fr-container flex flex-col my-4 gap-6'>
      <div className='flex flex-col'>
        <Select
          label='Type de fichier'
          nativeSelectProps={{
            onChange: handleFileTypeChange,
            value: fileType
          }}
        >
          <option disabled hidden value=''>Selectionnez un type de fichier</option>
          <option value='Données standardisées'>Données standardisées</option>
          <option disabled value='Tableau de suivi'>Tableau de suivi</option>
        </Select>

        <Upload
          hint='Déposé le fichier que vous souhaitez valider'
          state={inputError ? 'error' : 'default'}
          stateRelatedMessage={inputError}
          nativeInputProps={{
            onChange: handleFileChange,
            accept: '.xlsx, .xls, .ods'
          }}
        />

        <Button
          className='self-end'
          variant='contained'
          disabled={!file || !fileType || inputError || isLoading} onClick={submit}
        >
          {isLoading
            ? <div className='flex items-center gap-2'><CircularProgress size={12} /> Validation en cours…</div>
            : 'Valider le fichier'}
        </Button>
      </div>

      <div className='flex flex-col gap-4'>
        {fileErrors && (
          <Alert
            closable={false}
            title={fileErrors?.length === 0 ? 'Le fichier est valide' : 'Le fichier est invalide'}
            description={fileErrors?.length === 0 ? 'Aucune erreur détectée' : `Le fichier contient ${fileErrors?.length} erreur${fileErrors?.length > 1 ? 's' : ''}`}
            severity={fileErrors?.length === 0 ? 'success' : 'error'}
          />
        )}

        {file && fileErrors?.length > 0 && (
          <Card variant='outlined'>
            <CardContent>
              <Typography gutterBottom variant='h5' component='div'>
                {file.name}
              </Typography>
              <Typography variant='body2' sx={{color: 'text.secondary'}}>
                {file.size} octets
              </Typography>
            </CardContent>
            <FileValidationErrors errors={fileErrors} />
          </Card>
        )}
      </div>
    </div>
  )
}

export default FileValidateurForm
