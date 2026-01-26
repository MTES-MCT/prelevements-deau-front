'use client'

import {useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/Select'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {
  Button, CircularProgress, useEventCallback
} from '@mui/material'

const FileValidateurForm = ({isLoading, resetForm, handleSubmit}) => {
  const [file, setFile] = useState(null)
  const [cadresFile, setCadresFile] = useState(null)
  const [prelevementsFile, setPrelevementsFile] = useState(null)
  const [fileType, setFileType] = useState('aep-zre')
  const [inputError, setInputError] = useState(null)

  const isGidaf = fileType === 'gidaf'

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

  const handleCadresFileChange = useEventCallback(event => {
    const file = event.target.files?.[0]
    if (!file) {
      setCadresFile(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10 Mo
      setInputError('Le fichier Cadres dépasse la taille maximale autorisée (10 Mo)')
      setCadresFile(null)
    } else {
      resetForm()
      setInputError(null)
      setCadresFile(file)
    }
  }, [resetForm])

  const handlePrelevementsFileChange = useEventCallback(event => {
    const file = event.target.files?.[0]
    if (!file) {
      setPrelevementsFile(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10 Mo
      setInputError('Le fichier Prelevements dépasse la taille maximale autorisée (10 Mo)')
      setPrelevementsFile(null)
    } else {
      resetForm()
      setInputError(null)
      setPrelevementsFile(file)
    }
  }, [resetForm])

  const handleFileTypeChange = useEventCallback(event => {
    setFileType(event.target.value)
    resetForm()
    setInputError(null)
    setFile(null)
    setCadresFile(null)
    setPrelevementsFile(null)
  }, [])

  const handleSubmitClick = useEventCallback(() => {
    if (isGidaf) {
      handleSubmit({cadresFile, prelevementsFile}, fileType)
    } else {
      handleSubmit(file, fileType)
    }
  }, [file, cadresFile, prelevementsFile, fileType, isGidaf, handleSubmit])

  return (
    <div className='flex flex-col'>
      <Select
        label='Type de fichier'
        nativeSelectProps={{
          onChange: handleFileTypeChange,
          value: fileType
        }}
      >
        <option disabled hidden value=''>Sélectionnez un type de fichier</option>
        <option value='aep-zre'>Données standardisées (Tableau multi-paramètre)</option>
        <option value='camion-citerne'>Tableau de suivi camions citerne</option>
        <option value='template-file'>Fichier type</option>
        <option value='extract-aquasys'>Extraction Aquasys</option>
        <option value='gidaf'>Extraction Gidaf</option>
      </Select>

      {isGidaf ? (
        <>
          <Upload
            label='Fichier Cadres'
            hint='Déposez le fichier Cadres (métadonnées des points de prélèvement)'
            state={inputError ? 'error' : 'default'}
            stateRelatedMessage={inputError}
            nativeInputProps={{
              onChange: handleCadresFileChange,
              accept: '.xlsx, .xls, .ods'
            }}
          />
          <Upload
            label='Fichier Prelevements'
            hint='Déposez le fichier Prelevements (données de volumes)'
            state={inputError ? 'error' : 'default'}
            stateRelatedMessage={inputError}
            nativeInputProps={{
              onChange: handlePrelevementsFileChange,
              accept: '.xlsx, .xls, .ods'
            }}
          />
        </>
      ) : (
        <Upload
          hint='Déposé le fichier que vous souhaitez valider'
          state={inputError ? 'error' : 'default'}
          stateRelatedMessage={inputError}
          nativeInputProps={{
            onChange: handleFileChange,
            accept: '.xlsx, .xls, .ods'
          }}
        />
      )}

      <Button
        className='self-end'
        variant='contained'
        disabled={
          isGidaf
            ? !cadresFile || !prelevementsFile || !fileType || inputError || isLoading
            : !file || !fileType || inputError || isLoading
        }
        onClick={handleSubmitClick}
      >
        {isLoading
          ? <div className='flex items-center gap-2'><CircularProgress size={12} /> Validation en cours…</div>
          : 'Valider le fichier'}
      </Button>
    </div>
  )
}

export default FileValidateurForm
