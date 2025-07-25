'use client'

import {useState} from 'react'

import {validateMultiParamFile, validateCamionCiterneFile} from '@fabnum/prelevements-deau-timeseries-parsers'
import {Divider} from '@mui/material'

import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'

const ValidateurPage = () => {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [typePrelevement, setTypePrelevement] = useState(null)
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setFile(null)
    setResult(null)
  }

  const submit = async (file, prelevementType) => {
    setTypePrelevement(prelevementType)
    setFile(file)
    setIsLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const validation = prelevementType === 'aep-zre' ? validateMultiParamFile : validateCamionCiterneFile
      const result = await validation(buffer)
      result.data = result.data ? (prelevementType === 'aep-zre' ? [result.data] : result.data) : undefined

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
          <FileValidationResult
            file={file}
            typePrelevement={typePrelevement}
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
