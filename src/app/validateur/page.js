'use client'

import {useState} from 'react'

import {validateMultiParamFile, validateCamionCiterneFile} from '@fabnum/prelevements-deau-timeseries-parsers'
import {Typography} from '@mui/material'

import ValidateurForm from '@/components/declarations/validateur/form.js'
import ValidateurResult from '@/components/declarations/validateur/result.js'

const ValidateurPage = () => {
  const [file, setFile] = useState(null)
  const [fileErrors, setFileErrors] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setFile(null)
    setFileErrors(null)
  }

  const submit = async (file, fileType) => {
    setFile(file)
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

  return (
    <div className='fr-container flex flex-col my-4 gap-10'>
      <Typography variant='h3'>
        Validateur de fichier de déclaration de prélèvements
      </Typography>
      <p>
        Cet outil vous permet de valider la conformité de vos fichiers de déclaration de prélèvements avant de les soumettre sur Démarches Simplifiées.
      </p>

      <ValidateurForm
        isLoading={isLoading}
        resetForm={resetForm}
        handleSubmit={submit}
      />

      {fileErrors && (
        <ValidateurResult file={file} errors={fileErrors} />
      )}
    </div>
  )
}

export default ValidateurPage
