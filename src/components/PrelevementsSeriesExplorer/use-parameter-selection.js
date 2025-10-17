/**
 * Custom hook for managing parameter metadata and selection
 */

import {
  useMemo, useState, useCallback, useEffect
} from 'react'

import {
  FALLBACK_PARAMETER_COLOR,
  PARAMETER_COLOR_MAP,
  normalizeParameterKey
} from './constants.js'
import {indexDuplicateParameters} from './util.js'

/**
 * Extracts and organizes parameter metadata from series list
 *
 * @param {Array} seriesList - List of series with metadata
 * @returns {Object} Parameter metadata including options and map
 */
export function useParameterMetadata(seriesList) {
  return useMemo(() => {
    // Index duplicate parameters to add display labels
    const indexedSeries = indexDuplicateParameters(seriesList)

    // Assign colors based on unique parameter names
    const colorMap = new Map()
    for (const series of indexedSeries) {
      if (!series?.parameter || colorMap.has(series.parameter)) {
        continue
      }

      const normalized = normalizeParameterKey(series.parameter)
      const resolvedColor = series.color
        ?? PARAMETER_COLOR_MAP.get(normalized)
        ?? FALLBACK_PARAMETER_COLOR

      colorMap.set(series.parameter, resolvedColor)
    }

    // Build parameter metadata with parameterLabel as unique identifier
    const parameters = indexedSeries.map(s => ({
      parameter: s.parameter,
      parameterLabel: s.parameterLabel,
      unit: s.unit,
      color: colorMap.get(s.parameter),
      frequency: s.frequency,
      seriesId: s._id,
      valueType: s.valueType
    }))

    // Group parameters by unit for dropdown display (using simple strings)
    const groupedByUnit = new Map()

    for (const param of parameters) {
      const unit = param.unit || 'Sans unité'
      if (!groupedByUnit.has(unit)) {
        groupedByUnit.set(unit, [])
      }

      groupedByUnit.get(unit).push(param.parameterLabel)
    }

    const parameterOptions = [...groupedByUnit.entries()].map(([unit, labels]) => ({
      label: unit,
      options: labels
    }))

    // Use parameterLabel as key for direct lookup
    const parameterMap = new Map(parameters.map(param => [param.parameterLabel, param]))

    return {parameters, parameterOptions, parameterMap}
  }, [seriesList])
}

/**
 * Finds default parameters to select (prefers "Volume prélevé")
 *
 * @param {Array} parameters - Available parameters
 * @returns {Array<string>} Default selected parameterLabel
 */
function findDefaultSelectedParams(parameters) {
  if (!parameters || parameters.length === 0) {
    return []
  }

  const volumeParam = parameters.find(p =>
    p.parameter.toLowerCase().includes('volume')
    && p.parameter.toLowerCase().includes('prélevé')
  )

  if (volumeParam) {
    return [volumeParam.parameterLabel]
  }

  return [parameters[0].parameterLabel]
}

/**
 * Hook for managing parameter selection state
 *
 * @param {Array} parameters - Available parameters
 * @param {Map} parameterMap - Map of parameterLabel to metadata
 * @param {Function} onParameterChange - Callback when selection changes
 * @returns {Object} Selected params (parameterLabels), handlers, and validation state
 */
export function useParameterSelection(parameters, parameterMap, onParameterChange) {
  const defaultSelectedParam = useMemo(
    () => findDefaultSelectedParams(parameters),
    [parameters]
  )

  const [selectedParams, setSelectedParams] = useState(defaultSelectedParam)
  const [validationError, setValidationError] = useState(null)

  // Sync default selection when parameters change
  useEffect(() => {
    if (defaultSelectedParam.length === 0) {
      return
    }

    setSelectedParams(prev => {
      if (prev.length === 0) {
        return defaultSelectedParam
      }

      const stillValid = prev.every(paramLabel => parameterMap.has(paramLabel))
      return stillValid ? prev : defaultSelectedParam
    })
  }, [defaultSelectedParam, parameterMap])

  const handleParameterChange = useCallback(paramLabels => {
    // Validate selection - moved from util to avoid circular dependency
    const selectedParamsData = paramLabels
      .map(paramLabel => parameterMap.get(paramLabel))
      .filter(Boolean)

    const uniqueUnits = [...new Set(selectedParamsData.map(p => p.unit).filter(Boolean))]

    if (uniqueUnits.length > 2) {
      setValidationError('Vous ne pouvez sélectionner que 2 unités différentes maximum')
      return
    }

    setValidationError(null)
    setSelectedParams(paramLabels)
    onParameterChange?.(paramLabels)
  }, [parameterMap, onParameterChange])

  return {
    selectedParams,
    validationError,
    handleParameterChange
  }
}
