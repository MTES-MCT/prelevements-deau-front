/**
 * Custom hook for managing parameter metadata and selection
 */

import {
  useMemo, useState, useCallback, useEffect
} from 'react'

import {uniqBy} from 'lodash-es'

import {DEFAULT_COLOR_PALETTE} from './constants.js'
import {getColorForIndex} from './formatters.js'

/**
 * Extracts and organizes parameter metadata from series list
 *
 * @param {Array} seriesList - List of series with metadata
 * @returns {Object} Parameter metadata including options and map
 */
export function useParameterMetadata(seriesList) {
  return useMemo(() => {
    const uniqueParams = uniqBy(
      seriesList.map(s => ({parameter: s.parameter, color: s.color})),
      'parameter'
    )

    const colorMap = new Map()
    for (const [index, param] of uniqueParams.entries()) {
      colorMap.set(param.parameter, param.color || getColorForIndex(index, DEFAULT_COLOR_PALETTE))
    }

    const parameters = seriesList.map(s => ({
      parameter: s.parameter,
      unit: s.unit,
      color: colorMap.get(s.parameter),
      frequency: s.frequency,
      seriesId: s._id
    }))

    const uniqueParameterEntries = uniqBy(parameters.filter(Boolean), 'parameter')
    const groupedByUnit = new Map()

    for (const param of uniqueParameterEntries) {
      const unit = param.unit || 'Sans unité'
      if (!groupedByUnit.has(unit)) {
        groupedByUnit.set(unit, [])
      }

      groupedByUnit.get(unit).push(param.parameter)
    }

    const parameterOptions = [...groupedByUnit.entries()].map(([unit, params]) => ({
      label: unit,
      options: params
    }))

    const parameterMap = new Map(parameters.map(param => [param.parameter, param]))

    return {parameters, parameterOptions, parameterMap}
  }, [seriesList])
}

/**
 * Finds default parameters to select (prefers "Volume prélevé")
 *
 * @param {Array} parameters - Available parameters
 * @returns {Array<string>} Default selected parameter names
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
    return [volumeParam.parameter]
  }

  return [parameters[0].parameter]
}

/**
 * Hook for managing parameter selection state
 *
 * @param {Array} parameters - Available parameters
 * @param {Map} parameterMap - Map of parameter names to metadata
 * @param {Function} onParameterChange - Callback when selection changes
 * @returns {Object} Selected params, handlers, and validation state
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

      const stillValid = prev.every(name => parameterMap.has(name))
      return stillValid ? prev : defaultSelectedParam
    })
  }, [defaultSelectedParam, parameterMap])

  const handleParameterChange = useCallback(params => {
    // Validate selection - moved from util to avoid circular dependency
    const selectedParamsData = params
      .map(paramName => parameterMap.get(paramName))
      .filter(Boolean)

    const uniqueUnits = [...new Set(selectedParamsData.map(p => p.unit).filter(Boolean))]

    if (uniqueUnits.length > 2) {
      setValidationError('Vous ne pouvez sélectionner que 2 unités différentes maximum')
      return
    }

    setValidationError(null)
    setSelectedParams(params)
    onParameterChange?.(params)
  }, [parameterMap, onParameterChange])

  return {
    selectedParams,
    validationError,
    handleParameterChange
  }
}
