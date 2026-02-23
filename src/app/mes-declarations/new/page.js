'use client'

import {
  useCallback, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {
  extractMultiParamFile,
  extractCamionCiterne,
  extractTemplateFile,
  extractAquasys,
  extractGidaf
} from '@fabnum/prelevements-deau-timeseries-parsers'
import {Divider} from '@mui/material'
import moment from 'moment'
import 'moment/locale/fr'

import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'
import {createLocalSeriesRegistry} from '@/lib/local-series-registry.js'
import {getDeclarationURL} from '@/lib/urls.js'
import {createDeclarationAction, revalidateDeclarationPaths} from '@/server/actions/declarations.js'
import {getPointPrelevementAction} from '@/server/actions/index.js'
import {coerceNumericValue} from '@/utils/number.js'
import {normalizePointId} from '@/utils/point-prelevement.js'
import {normalizeString} from '@/utils/string.js'
import {normalizeTime} from '@/utils/time.js'

moment.locale('fr')

const LOCAL_SERIES_PREFIX = 'local-validation:'

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

/**
 * Detect parameters that represent extracted volume (with accents handled).
 * @param {string} parameter
 * @returns {boolean}
 */
const isVolumeParameter = parameter => {
  if (typeof parameter !== 'string') {
    return false
  }

  const normalized = normalizeString(parameter) ?? ''
  return normalized.includes('volume') && normalized.includes('prelev')
}

/**
 * Normalize parser data entries into cached structures for daily or sub-daily series.
 * @param {Array} entries
 * @returns {{localValues: Array, numberOfValues: number, hasSubDaily: boolean}}
 */
const buildLocalSeriesValues = entries => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {localValues: [], numberOfValues: 0, hasSubDaily: false}
  }

  const hasTimeEntries = entries.some(entry => entry?.time)

  if (!hasTimeEntries) {
    const localValues = entries
      .filter(entry => entry?.date)
      .map(entry => {
        const numericValue = coerceNumericValue(entry?.value)
        const mapped = {
          date: entry.date,
          value: numericValue
        }

        if (entry?.remark) {
          mapped.remark = entry.remark
        }

        return mapped
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    const numberOfValues = localValues.reduce(
      (count, entry) => count + (entry.value === null ? 0 : 1),
      0
    )

    return {localValues, numberOfValues, hasSubDaily: false}
  }

  const grouped = new Map()
  for (const entry of entries) {
    if (!entry?.date) {
      continue
    }

    const time = normalizeTime(entry.time)
    if (!time) {
      continue
    }

    const numericValue = coerceNumericValue(entry.value)
    if (numericValue === null) {
      continue
    }

    const bucket = grouped.get(entry.date) ?? []
    const valueEntry = {time, value: numericValue}
    if (entry?.remark) {
      valueEntry.remark = entry.remark
    }

    bucket.push(valueEntry)
    grouped.set(entry.date, bucket)
  }

  if (grouped.size === 0) {
    return {localValues: [], numberOfValues: 0, hasSubDaily: true}
  }

  const localValues = [...grouped.entries()]
    .map(([date, values]) => ({
      date,
      values: values.sort((a, b) => a.time.localeCompare(b.time))
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const numberOfValues = localValues.reduce(
    (sum, entry) => sum + entry.values.length,
    0
  )

  return {localValues, numberOfValues, hasSubDaily: true}
}

/**
 * Produce an iterable list of series regardless of parser payload shape.
 * @param {*} input
 * @returns {Array}
 */
const normalizeSeriesIterable = input => {
  if (Array.isArray(input?.series)) {
    return input.series
  }

  if (Array.isArray(input)) {
    return input
  }

  return []
}

/**
 * Resolve min/max date for a series using parser metadata and cached values.
 * @param {Object} serie
 * @param {Array} values
 * @returns {{minDate: (string|null), maxDate: (string|null)}}
 */
const resolveBounds = (serie, values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      minDate: serie.minDate ?? null,
      maxDate: serie.maxDate ?? null
    }
  }

  const firstDate = values[0]?.date ?? null
  const lastDate = values.at(-1)?.date ?? null

  return {
    minDate: serie.minDate ?? firstDate,
    maxDate: serie.maxDate ?? lastDate
  }
}

/**
 * Build a series descriptor consumed by FileValidationResult and analytics widgets.
 * @param {Object} params
 * @returns {Object}
 */
const createSeriesEntry = ({
  serie,
  seriesId,
  pointId,
  index,
  localValues,
  numberOfValues,
  hasSubDaily
}) => {
  const {minDate, maxDate} = resolveBounds(serie, localValues)

  return {
    _id: seriesId,
    pointPrelevement: pointId,
    parameter: serie.parameter ?? `Paramètre ${index + 1}`,
    unit: serie.unit ?? '',
    frequency: serie.frequency ?? '1 day',
    valueType: serie.valueType ?? 'raw',
    minDate,
    maxDate,
    numberOfValues,
    hasSubDaily,
    extras: serie.extras
  }
}

/**
 * Aggregate total volume using daily series flagged as volume parameters.
 * @param {Object} serieContext
 * @param {Object} totals
 */
const maybeAccumulateVolume = ({serie, localValues, hasSubDaily}, totals) => {
  if (!isVolumeParameter(serie?.parameter) || hasSubDaily) {
    return
  }

  let sum = 0
  let hasValue = false

  for (const entry of localValues) {
    if (entry?.value === null || entry?.value === undefined) {
      continue
    }

    sum += entry.value
    hasValue = true
  }

  if (hasValue) {
    totals.totalVolume += sum
    totals.hasVolumeEntries = true
  }
}

/**
 * Convert newly extracted series into UI-ready descriptors and cached values.
 * @param {'aep-zre'|'camion-citerne'|'template-file'|'extract-aquasys'|'gidaf'} prelevementType
 * @param {*} seriesInput
 * @returns {{series: Array, localSeriesEntries: Array, pointIds: Array<string>, totalVolumePreleve: number|null}}
 */
const convertExtractedSeries = (prelevementType, seriesInput) => {
  const prefixMap = {
    'camion-citerne': 'camion',
    'aep-zre': 'aep',
    'template-file': 'template',
    'extract-aquasys': 'aquasys',
    gidaf: 'gidaf'
  }
  const seriesTypePrefix = prefixMap[prelevementType] || 'aep'
  const aggregates = {
    series: [],
    localSeriesEntries: [],
    pointIds: new Set(),
    totalVolume: 0,
    hasVolumeEntries: false
  }

  for (const [index, serie] of normalizeSeriesIterable(seriesInput).entries()) {
    if (!serie) {
      continue
    }

    const pointId = normalizePointId(serie.pointPrelevement)
    if (pointId) {
      aggregates.pointIds.add(pointId)
    }

    const {localValues, numberOfValues, hasSubDaily} = buildLocalSeriesValues(serie.data)

    const seriesId = `${LOCAL_SERIES_PREFIX}${seriesTypePrefix}:${index}`

    aggregates.localSeriesEntries.push({id: seriesId, values: localValues})
    aggregates.series.push(
      createSeriesEntry({
        serie,
        seriesId,
        pointId,
        index,
        localValues,
        numberOfValues,
        hasSubDaily
      })
    )

    maybeAccumulateVolume({serie, localValues, hasSubDaily}, aggregates)
  }

  return {
    series: aggregates.series,
    localSeriesEntries: aggregates.localSeriesEntries,
    pointIds: [...aggregates.pointIds],
    totalVolumePreleve: aggregates.hasVolumeEntries ? aggregates.totalVolume : null
  }
}

const getDisplayFileName = fileOrFiles => {
  if (!fileOrFiles) {
    return ''
  }

  // GIDAF: {cadresFile, prelevementsFile}
  if (fileOrFiles?.cadresFile && fileOrFiles?.prelevementsFile) {
    return `${fileOrFiles.cadresFile.name} + ${fileOrFiles.prelevementsFile.name}`
  }

  // 1 fichier
  return fileOrFiles.name ?? ''
}

const buildUploadPayload = (fileOrFiles, prelevementType) => {
  if (!prelevementType) {
    throw new Error('Type de prélèvement manquant.')
  }

  if (prelevementType === 'gidaf') {
    if (!fileOrFiles?.cadresFile || !fileOrFiles?.prelevementsFile) {
      throw new Error('Les deux fichiers (Cadres et Prelevements) sont requis pour GIDAF')
    }

    return {
      files: [fileOrFiles.cadresFile, fileOrFiles.prelevementsFile],
      fileTypes: [`${prelevementType}:cadres`, `${prelevementType}:prelevements`]
    }
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
  const [typePrelevement, setTypePrelevement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [pointsPrelevement, setPointsPrelevement] = useState([])
  const [preleveurs, setPreleveurs] = useState([])
  const [comment, setComment] = useState('')
  const [aotDecreeNumber, setAotDecreeNumber] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)

  const registryRef = useRef(createLocalSeriesRegistry())

  const getLocalSeriesValuesFn = useCallback(
    (seriesId, params) => registryRef.current.get(seriesId, params) ?? {values: []},
    []
  )

  const resetForm = () => {
    setFile(null)
    setTypePrelevement(null)
    setValidationResult(null)
    setPointsPrelevement([])
    setPreleveurs([])
    setIsSubmitting(false)
    setSubmitResult(null)
    setComment('')
    setAotDecreeNumber('')

    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }

  const resetFileForm = () => {
    setFile(null)
    setTypePrelevement(null)
    setValidationResult(null)
    setPointsPrelevement([])
    setPreleveurs([])
    setIsSubmitting(false)
    setSubmitResult(null)

    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }

  const submit = async (selectedFileOrFiles, prelevementType) => {
    setTypePrelevement(prelevementType)
    setFile(selectedFileOrFiles)
    setIsLoading(true)
    setSubmitResult(null)

    try {
      let extractFn
      let result

      switch (prelevementType) {
        case 'aep-zre': {
          extractFn = extractMultiParamFile
          {
            const buffer = await selectedFileOrFiles.arrayBuffer()
            result = await extractFn(buffer)
          }

          break
        }

        case 'camion-citerne': {
          extractFn = extractCamionCiterne
          {
            const buffer2 = await selectedFileOrFiles.arrayBuffer()
            result = await extractFn(buffer2)
          }

          break
        }

        case 'template-file': {
          extractFn = extractTemplateFile
          {
            const buffer3 = await selectedFileOrFiles.arrayBuffer()
            result = await extractFn(buffer3)
          }

          break
        }

        case 'extract-aquasys': {
          extractFn = extractAquasys
          {
            const buffer4 = await selectedFileOrFiles.arrayBuffer()
            result = await extractFn(buffer4)
          }

          break
        }

        case 'gidaf': {
          extractFn = extractGidaf
          if (
            !selectedFileOrFiles
                        || !selectedFileOrFiles.cadresFile
                        || !selectedFileOrFiles.prelevementsFile
          ) {
            throw new Error('Les deux fichiers (Cadres et Prelevements) sont requis pour GIDAF')
          }

          {
            const cadresBuffer = await selectedFileOrFiles.cadresFile.arrayBuffer()
            const prelevementsBuffer = await selectedFileOrFiles.prelevementsFile.arrayBuffer()
            result = await extractFn(cadresBuffer, prelevementsBuffer)
          }

          break
        }

        default: {
          throw new Error(`Type de fichier non supporté: ${prelevementType}`)
        }
      }

      const errors = Array.isArray(result?.errors) ? result.errors : []
      const metadataPoints = result?.data?.metadata?.pointsPrelevement || []
      const metadataPreleveurs = result?.data?.metadata?.preleveurs || []
      setPreleveurs(metadataPreleveurs)

      registryRef.current.clear(LOCAL_SERIES_PREFIX)
      const conversion = convertExtractedSeries(prelevementType, result?.data)
      registryRef.current.register(conversion.localSeriesEntries)

      // Ne pas vérifier l'existence des points pour template-file, aquasys et gidaf
      const skipPointCheck = ['template-file', 'extract-aquasys', 'gidaf'].includes(prelevementType)

      if (skipPointCheck) {
        setPointsPrelevement(metadataPoints)
      } else {
        const uniquePointIds = conversion.pointIds
        if (uniquePointIds.length > 0) {
          const fetchedResults = await Promise.all(
            uniquePointIds.map(async id => {
              try {
                const r = await getPointPrelevementAction(id)
                return r.success ? r.data : null
              } catch {
                return null
              }
            })
          )

          setPointsPrelevement(fetchedResults.filter(Boolean))
        } else {
          setPointsPrelevement([])
        }

        setPreleveurs([])
      }

      setValidationResult({
        errors,
        series: conversion.series,
        totalVolumePreleve: conversion.totalVolumePreleve,
        validationStatus: computeValidationStatus(errors)
      })
    } catch (error) {
      console.error('Erreur lors de la validation du fichier:', error)
      registryRef.current.clear(LOCAL_SERIES_PREFIX)
      setPointsPrelevement([])
      setValidationResult({
        errors: [
          {
            message: 'Une erreur est survenue lors de la validation du fichier.',
            severity: 'error'
          }
        ],
        series: [],
        totalVolumePreleve: null,
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
        && Boolean(typePrelevement)
        && validationResult?.validationStatus
        && validationResult.validationStatus !== 'error'

  const submitDeclaration = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      if (!file || !typePrelevement) {
        throw new Error('Aucun fichier à soumettre.')
      }

      if (!validationResult || validationResult.validationStatus === 'error') {
        throw new Error('Le fichier n’est pas valide. Corrige les erreurs avant de soumettre.')
      }

      const {files, fileTypes} = buildUploadPayload(file, typePrelevement)

      const result = await createDeclarationAction({
        type: typePrelevement,
        files,
        fileTypes,
        comment,
        aotDecreeNumber
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Erreur lors de la création de la déclaration.')
      }

      // Revalidation des pages liste/détail
      revalidateDeclarationPaths(result?.data?.data?.id)

      setSubmitResult({
        status: 'success',
        message: 'Déclaration soumise avec succès.'
      })

      window.location.href = getDeclarationURL(result.data.data)
    } catch (error) {
      console.error(error)
      setSubmitResult({
        status: 'error',
        message: error?.message || 'Erreur lors de la soumission.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [file, typePrelevement, validationResult, comment, aotDecreeNumber])

  return (
    <>
      <div className='fr-container fr-mt-2w fr-mb-2w'>
        <div className='fr-grid-row fr-grid-row--gutters'>
          <div className='fr-col-12 fr-col-md-6'>
            <Input
                label='Numéro d’arrêté AOT'
                nativeInputProps={{
                  value: aotDecreeNumber,
                  onChange: e => setAotDecreeNumber(e.target.value)
                }}
                hintText='Facultatif'
            />
          </div>

          <div className='fr-col-12 fr-col-md-6'>
            <Input
                textArea
                label='Commentaire'
                nativeTextAreaProps={{
                  value: comment,
                  onChange: e => setComment(e.target.value),
                  rows: 3
                }}
                hintText='Facultatif'
            />
          </div>
        </div>

        <ValidateurForm
            isLoading={isLoading}
            resetForm={resetFileForm}
            handleSubmit={submit}
        />

      </div>

      {validationResult && file && (
        <>
          <Divider component='div' />

          <div className='fr-mt-2w fr-mb-2w'>
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
          </div>

          <FileValidationResult
            fileName={getDisplayFileName(file)}
            typePrelevement={typePrelevement}
            pointsPrelevement={pointsPrelevement}
            preleveurs={preleveurs}
            series={validationResult.series}
            integrations={[]}
            validationStatus={validationResult.validationStatus}
            errors={validationResult.errors}
            totalVolumePreleve={validationResult.totalVolumePreleve}
            getSeriesValues={getLocalSeriesValuesFn}
          />
        </>
      )}
    </>
  )
}

export default NouvelleDeclarationPage
