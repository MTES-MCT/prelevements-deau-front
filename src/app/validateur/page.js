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
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
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
      result.data = result.data ? (fileType === 'Données standardisées' ? [result.data] : result.data) : undefined

      if (result.data) {
        const pointsPrelevement = await Promise.all(result.data.map(({pointPrelevement}) => getPointPrelevement(pointPrelevement)))
        setPointsPrelevement(pointsPrelevement)
      }

      setResult(result)
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
            pointsPrelevement={pointsPrelevement}
            data={result.data}
            errors={result.errors}
          />
        </>
      )}
    </>
  )
}

export default ValidateurPage
