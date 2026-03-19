'use client'

import {
  useCallback, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {extractTemplateFile} from '@fabnum/prelevements-deau-timeseries-parsers'
import moment from 'moment'
import 'moment/locale/fr'

import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'
import {createLocalSeriesRegistry} from '@/lib/local-series-registry.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {createDeclarationAction, revalidateDeclarationPaths} from '@/server/actions/declarations.js'

moment.locale('fr')

const LOCAL_SERIES_PREFIX = 'local-validation:'
const PRELEVEMENT_TYPE = 'template-file'

/**
 * Derive UI validation status from the parser error list.
 * @param {Array} errors
 * @returns {'success'|'warning'|'error'}
 */
const computeValidationStatus = (errors = []) => {
  if (errors.some(error => error?.severity === 'error')) {
    return 'error'
  }

  if (errors.some(error => error?.severity === 'warning')) {
    return 'warning'
  }

  return 'success'
}

const getDisplayFileName = fileOrFiles => {
  if (!fileOrFiles) {
    return ''
  }

  return fileOrFiles.name ?? ''
}

const buildUploadPayload = (fileOrFiles, prelevementType) => {
  if (!prelevementType) {
    throw new Error('Type de prélèvement manquant.')
  }

  if (!fileOrFiles) {
    throw new Error('Fichier manquant.')
  }

  return {
    files: [fileOrFiles],
    fileTypes: [prelevementType]
  }
}

const NouvelleDeclarationPage = () => {
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [comment, setComment] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)

  const registryRef = useRef(createLocalSeriesRegistry())

  const resetForm = () => {
    setFile(null)
    setValidationResult(null)
    setIsSubmitting(false)
    setSubmitResult(null)
    setComment('')

    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }

  const resetFileForm = () => {
    setFile(null)
    setValidationResult(null)
    setIsSubmitting(false)
    setSubmitResult(null)

    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }

  const submit = async (
    selectedFileOrFiles,
    comment
  ) => {
    setFile(selectedFileOrFiles)
    setComment(comment)
    setIsLoading(true)
    setSubmitResult(null)

    try {
      const buffer = await selectedFileOrFiles.arrayBuffer()
      const result = await extractTemplateFile(buffer)

      const errors = Array.isArray(result?.errors) ? result.errors : []

      setValidationResult({
        errors,
        validationStatus: computeValidationStatus(errors)
      })
    } catch (error) {
      console.error('Erreur lors de la validation du fichier:', error)
      registryRef.current.clear(LOCAL_SERIES_PREFIX)
      setValidationResult({
        errors: [
          {
            message: 'Une erreur est survenue lors de la validation du fichier.',
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
        && Boolean(file)
        && validationResult?.validationStatus
        && validationResult.validationStatus !== 'error'

  const submitDeclaration = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      if (!file) {
        throw new Error('Aucun fichier à soumettre.')
      }

      if (!validationResult || validationResult.validationStatus === 'error') {
        throw new Error('Le fichier n’est pas valide. Corrige les erreurs avant de soumettre.')
      }

      const {files, fileTypes} = buildUploadPayload(file, PRELEVEMENT_TYPE)

      const result = await createDeclarationAction({
        type: PRELEVEMENT_TYPE,
        files,
        fileTypes,
        comment
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Erreur lors de la création de la déclaration.')
      }

      // Revalidation des pages liste/détail
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
  }, [file, validationResult, comment])

  return (
    <>
      <div className='fr-container fr-mt-2w fr-mb-2w'>
        <ValidateurForm
          isLoading={isLoading}
          resetForm={resetFileForm}
          handleSubmit={submit}
        />
      </div>

      {validationResult && file && (
        <div className='fr-mt-2w fr-mb-2w'>

          <FileValidationResult
            fileName={getDisplayFileName(file)}
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

export default NouvelleDeclarationPage
