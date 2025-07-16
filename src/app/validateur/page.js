'use client'

import {useState} from 'react'

import {validateMultiParamFile, validateCamionCiterneFile} from '@fabnum/prelevements-deau-timeseries-parsers'
import {Divider} from '@mui/material'

import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'
import ValidateurResult from '@/components/declarations/validateur/result.js'

const ValidateurPage = () => {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [pointPrelevement, setPointPrelevement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setFile(null)
    setResult(null)
  }

  const submit = async (file, fileType) => {
    setFileType(fileType)
    setFile(file)
    setIsLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const validation = fileType === 'Données standardisées' ? validateMultiParamFile : validateCamionCiterneFile
      const result = await validation(buffer)

      setResult(result)

      if (result.data.pointPrelevement) {
        const pointPrelevement = await getPointPrelevement(result.data.pointPrelevement)
        setPointPrelevement(pointPrelevement)
      }
    } catch (error) {
      console.error('Erreur lors de la validation du fichier:', error)
    }

    setIsLoading(false)
  }

  return (
    <>
      <ValidateurForm
        isLoading={isLoading}
        resetForm={resetForm}
        handleSubmit={submit}
      />

      {result && (
        <>
          <Divider component='div' />
          <ValidateurResult
            file={file}
            fileType={fileType}
            pointPrelevement={pointPrelevement}
            data={result.data}
            errors={result.errors}
          />
        </>
      )}
    </>
  )
}

export default ValidateurPage
