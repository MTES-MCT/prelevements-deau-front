'use client'

import {useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/Select'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {
  Button, CircularProgress, useEventCallback
} from '@mui/material'

const FileValidateurForm = ({isLoading, resetForm, handleSubmit}) => {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('Données standardisées')
  const [inputError, setInputError] = useState(null)

  const handleFileChange = useEventCallback(event => {
    const file = event.target.files[0]
    if (file.size > 10 * 1024 * 1024) { // 10 Mo
      setInputError('Le fichier dépasse la taille maximale autorisée (10 Mo)')
    } else {
      resetForm()
      setInputError(null)
      setFile(file)
    }
  }, [])

  const handleFileTypeChange = useEventCallback(event => {
    setFileType(event.target.value)
    resetForm()
    setInputError(null)
  }, [])

  const handleSubmitClick = useEventCallback(() => {
    handleSubmit(file, fileType)
  }, [file, fileType])

  return (
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
        <option disabled value='Tableau de suivi'>Tableau de suivi (à venir)</option>
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
        disabled={!file || !fileType || inputError || isLoading} onClick={handleSubmitClick}
      >
        {isLoading
          ? <div className='flex items-center gap-2'><CircularProgress size={12} /> Validation en cours…</div>
          : 'Valider le fichier'}
      </Button>
    </div>
  )
}

export default FileValidateurForm
