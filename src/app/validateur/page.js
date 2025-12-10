'use client'

import {useCallback, useRef, useState} from 'react'

import {extractMultiParamFile, extractCamionCiterne} from '@fabnum/prelevements-deau-timeseries-parsers'
import {Divider} from '@mui/material'

import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import ValidateurForm from '@/components/declarations/validateur/form.js'
import {createLocalSeriesRegistry} from '@/lib/local-series-registry.js'
import {coerceNumericValue} from '@/utils/number.js'
import {normalizePointId} from '@/utils/point-prelevement.js'
import {normalizeString} from '@/utils/string.js'
import {normalizeTime} from '@/utils/time.js'

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
 * @param {'aep-zre'|'camion-citerne'} prelevementType
 * @param {*} seriesInput
 * @returns {{series: Array, localSeriesEntries: Array, pointIds: Array<string>, totalVolumePreleve: number|null}}
 */
const convertExtractedSeries = (prelevementType, seriesInput) => {
  const seriesTypePrefix = prelevementType === 'camion-citerne' ? 'camion' : 'aep'
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

    const {
      localValues,
      numberOfValues,
      hasSubDaily
    } = buildLocalSeriesValues(serie.data)

    const seriesId = `${LOCAL_SERIES_PREFIX}${seriesTypePrefix}:${index}`

    aggregates.localSeriesEntries.push({id: seriesId, values: localValues})
    aggregates.series.push(createSeriesEntry({
      serie,
      seriesId,
      pointId,
      index,
      localValues,
      numberOfValues,
      hasSubDaily
    }))

    maybeAccumulateVolume({serie, localValues, hasSubDaily}, aggregates)
  }

  return {
    series: aggregates.series,
    localSeriesEntries: aggregates.localSeriesEntries,
    pointIds: [...aggregates.pointIds],
    totalVolumePreleve: aggregates.hasVolumeEntries ? aggregates.totalVolume : null
  }
}

const ValidateurPage = () => {
  const [file, setFile] = useState(null)
  const [typePrelevement, setTypePrelevement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [pointsPrelevement, setPointsPrelevement] = useState([])

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
    registryRef.current.clear(LOCAL_SERIES_PREFIX)
  }

  const submit = async (selectedFile, prelevementType) => {
    setTypePrelevement(prelevementType)
    setFile(selectedFile)
    setIsLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const extractFn = prelevementType === 'aep-zre'
        ? extractMultiParamFile
        : extractCamionCiterne

      const result = await extractFn(buffer)
      const errors = Array.isArray(result?.errors) ? result.errors : []

      registryRef.current.clear(LOCAL_SERIES_PREFIX)
      const conversion = convertExtractedSeries(prelevementType, result?.data)
      registryRef.current.register(conversion.localSeriesEntries)

      const uniquePointIds = conversion.pointIds
      if (uniquePointIds.length > 0) {
        const fetchedPoints = await Promise.all(uniquePointIds.map(async id => {
          try {
            return await getPointPrelevement(id)
          } catch {
            return null
          }
        }))

        setPointsPrelevement(fetchedPoints.filter(Boolean))
      } else {
        setPointsPrelevement([])
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
        errors: [{
          message: 'Une erreur est survenue lors de la validation du fichier.',
          severity: 'error'
        }],
        series: [],
        totalVolumePreleve: null,
        validationStatus: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <ValidateurForm
        isLoading={isLoading}
        resetForm={resetForm}
        handleSubmit={submit}
      />

      {validationResult && file && (
        <>
          <Divider component='div' />
          <FileValidationResult
            fileName={file.name}
            typePrelevement={typePrelevement}
            pointsPrelevement={pointsPrelevement}
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

export default ValidateurPage
