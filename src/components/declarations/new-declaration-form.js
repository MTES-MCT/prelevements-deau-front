'use client'

import {
  useCallback, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import moment from 'moment'
import 'moment/locale/fr'

import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'
import {createLocalSeriesRegistry} from '@/lib/local-series-registry.js'
import {extractTemplateFile} from '@/lib/template-file-parser/index.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {createDeclarationAction, revalidateDeclarationPaths} from '@/server/actions/declarations.js'

moment.locale('fr')

const LOCAL_SERIES_PREFIX = 'local-validation:'
const TEMPLATE_DECLARATION_TYPE_CODE = 'template-file'

const computeValidationStatus = (errors = []) => {
  if (errors.some(error => error?.severity === 'error')) {
    return 'error'
  }

  if (errors.some(error => error?.severity === 'warning')) {
    return 'warning'
  }

  return 'success'
}

const normalizeSelectedFiles = selectedFilesOrFile => {
  if (!selectedFilesOrFile) {
    return []
  }

  if (Array.isArray(selectedFilesOrFile)) {
    return selectedFilesOrFile
  }

  if (typeof selectedFilesOrFile.length === 'number' && !selectedFilesOrFile.arrayBuffer) {
    return [...selectedFilesOrFile]
  }

  return [selectedFilesOrFile]
}

const getDisplayFileName = files => {
  if (!files?.length) {
    return ''
  }

  if (files.length === 1) {
    return files[0].name ?? 'Fichier sélectionné'
  }

  return `${files.length} fichiers sélectionnés : ${files.map(file => file.name).join(', ')}`
}

const buildUploadPayload = (files, declarationTypeCode) => {
  const selectedFiles = normalizeSelectedFiles(files)
  const normalizedDeclarationTypeCode = String(declarationTypeCode ?? '').trim().toLocaleLowerCase('fr-FR')

  if (!normalizedDeclarationTypeCode) {
    throw new Error('Type de déclaration manquant.')
  }

  if (selectedFiles.length === 0) {
    throw new Error('Fichier manquant.')
  }

  return {
    files: selectedFiles,
    fileTypes: selectedFiles.map(() => normalizedDeclarationTypeCode)
  }
}

const validateTemplateFiles = async files => {
  const errors = []

  for (const selectedFile of files) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const buffer = await selectedFile.arrayBuffer()
      // eslint-disable-next-line no-await-in-loop
      const result = await extractTemplateFile(buffer)
      const fileErrors = Array.isArray(result?.errors) ? result.errors : []

      errors.push(
        ...fileErrors.map(error => ({
          ...error,
          message: `[${selectedFile.name}] ${error.message || 'Erreur non spécifiée'}`
        }))
      )
    } catch (error) {
      console.error('Erreur lors de la validation du fichier:', error)
      errors.push({
        message: `[${selectedFile.name}] Une erreur est survenue lors de la validation du fichier.`,
        severity: 'error'
      })
    }
  }

  return {
    errors,
    validationStatus: computeValidationStatus(errors)
  }
}

const validateFiles = async (files, declarationTypeCode) => {
  if (declarationTypeCode === TEMPLATE_DECLARATION_TYPE_CODE) {
    return validateTemplateFiles(files)
  }

  return {
    errors: [
      {
        message: 'La validation automatique côté navigateur n’est pas disponible pour ce type de déclaration. Les fichiers seront contrôlés au traitement.',
        severity: 'warning'
      }
    ],
    validationStatus: 'warning'
  }
}

function getUnavailableDeclarationAlertProps({
  allowedDeclarationTypes
}) {
  if (allowedDeclarationTypes.length === 0) {
    return {
      severity: 'info',
      title: 'Aucun type de déclaration disponible',
      description: 'Votre compte déclarant n’est actuellement autorisé à déposer aucun type de déclaration par fichier.'
    }
  }

  return null
}

const NewDeclarationForm = ({allowedDeclarationTypes = []}) => {
  const initialDeclarationTypeCode = allowedDeclarationTypes.length === 1
    ? allowedDeclarationTypes[0].code
    : ''
  const [declarationTypeCode, setDeclarationTypeCode] = useState(initialDeclarationTypeCode)
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [comment, setComment] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)

  const registryRef = useRef(createLocalSeriesRegistry())

  const selectedDeclarationType = useMemo(
    () => allowedDeclarationTypes.find(type => type.code === declarationTypeCode) ?? null,
    [allowedDeclarationTypes, declarationTypeCode]
  )

  const resetFileForm = useCallback(() => {
    setFiles([])
    setValidationResult(null)
    setIsSubmitting(false)
    setSubmitResult(null)

    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }, [])

  const resetForm = useCallback(() => {
    resetFileForm()
    setComment('')
    setDeclarationTypeCode(initialDeclarationTypeCode)
  }, [initialDeclarationTypeCode, resetFileForm])

  const handleDeclarationTypeChange = useCallback(value => {
    setDeclarationTypeCode(value)
    resetFileForm()
  }, [resetFileForm])

  const submit = async selectedFilesOrFile => {
    const selectedFiles = normalizeSelectedFiles(selectedFilesOrFile)

    setFiles(selectedFiles)
    setIsLoading(true)
    setSubmitResult(null)

    try {
      if (!declarationTypeCode) {
        throw new Error('Sélectionne un type de déclaration avant d’ajouter des fichiers.')
      }

      if (selectedFiles.length === 0) {
        throw new Error('Aucun fichier sélectionné.')
      }

      const result = await validateFiles(selectedFiles, declarationTypeCode)
      setValidationResult(result)
    } catch (error) {
      console.error(error)
      registryRef.current.clear(LOCAL_SERIES_PREFIX)
      setValidationResult({
        errors: [
          {
            message: error?.message || 'Une erreur est survenue lors de la validation des fichiers.',
            severity: 'error'
          }
        ],
        validationStatus: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmitDeclaration
        = !isLoading
        && !isSubmitting
        && Boolean(declarationTypeCode)
        && files.length > 0
        && validationResult?.validationStatus
        && validationResult.validationStatus !== 'error'

  const submitDeclaration = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      if (files.length === 0) {
        throw new Error('Aucun fichier à soumettre.')
      }

      if (!selectedDeclarationType) {
        throw new Error('Type de déclaration non autorisé ou indisponible.')
      }

      if (!validationResult || validationResult.validationStatus === 'error') {
        throw new Error('La sélection n’est pas valide. Corrige les erreurs avant de soumettre.')
      }

      const {files: filesToUpload, fileTypes} = buildUploadPayload(files, selectedDeclarationType.code)

      const result = await createDeclarationAction({
        type: selectedDeclarationType.code,
        files: filesToUpload,
        fileTypes,
        comment
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Erreur lors de la création de la déclaration.')
      }

      await revalidateDeclarationPaths(result?.data?.data?.id)

      setSubmitResult({
        status: 'success',
        message: 'Déclaration soumise avec succès.'
      })

      window.location.href = getMyDeclarationURL(result.data.data)
    } catch (error) {
      console.error(error)
      setSubmitResult({
        status: 'error',
        message: error?.message || 'Erreur lors de la soumission.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [files, selectedDeclarationType, validationResult, comment])

  const unavailableAlertProps = getUnavailableDeclarationAlertProps({
    allowedDeclarationTypes
  })

  if (unavailableAlertProps) {
    return <Alert {...unavailableAlertProps} />
  }

  return (
    <>
      <div className='fr-mt-2w fr-mb-2w'>
        <ValidateurForm
          allowedDeclarationTypes={allowedDeclarationTypes}
          comment={comment}
          isLoading={isLoading}
          resetForm={resetFileForm}
          selectedDeclarationTypeCode={declarationTypeCode}
          handleSubmit={submit}
          onCommentChange={setComment}
          onDeclarationTypeChange={handleDeclarationTypeChange}
        />
      </div>

      {validationResult && files.length > 0 && (
        <div className='fr-mt-2w fr-mb-2w'>
          <FileValidationResult
            fileName={getDisplayFileName(files)}
            validationStatus={validationResult.validationStatus}
            errors={validationResult.errors}
          />

          <div className='fr-mt-2w flex gap-2 items-center'>
            <Button
              priority='primary'
              disabled={!canSubmitDeclaration}
              onClick={submitDeclaration}
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre la déclaration'}
            </Button>

            <Button
              priority='secondary'
              disabled={isLoading || isSubmitting}
              onClick={resetForm}
            >
              Réinitialiser
            </Button>
          </div>

          {submitResult?.status === 'success' && (
            <Alert
              severity='success'
              title='Soumission effectuée'
              description={submitResult.message}
            />
          )}

          {submitResult?.status === 'error' && (
            <Alert
              severity='error'
              title='Soumission impossible'
              description={submitResult.message}
            />
          )}
        </div>
      )}
    </>
  )
}

export default NewDeclarationForm
