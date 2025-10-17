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
      seriesId: s._id
    }))

    // Use parameterLabel as key for direct lookup
    const parameterMap = new Map(parameters.map(param => [param.parameterLabel, param]))

    return {parameters, parameterMap}
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

const FALLBACK_UNIT_LABEL = 'Sans unité'

const normalizeUnitLabel = unit => {
  if (typeof unit === 'string' && unit.trim()) {
    return unit.trim()
  }

  return FALLBACK_UNIT_LABEL
}

/**
 * Hook for managing parameter selection state
 *
 * @param {Array} parameters - Available parameters
 * @param {Map} parameterMap - Map of parameterLabel to metadata
 * @param {Function} onParameterChange - Callback when selection changes
 * @returns {Object} Selected params (parameterLabels), computed options, and change handler
 */
export function useParameterSelection(parameters, parameterMap, onParameterChange) {
  const defaultSelectedParam = useMemo(
    () => findDefaultSelectedParams(parameters),
    [parameters]
  )

  const [selectedParams, setSelectedParams] = useState(defaultSelectedParam)

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

  const selectedUnits = useMemo(() => {
    const units = new Set()
    for (const label of selectedParams) {
      const param = parameterMap.get(label)
      if (!param) {
        continue
      }

      units.add(normalizeUnitLabel(param.unit))
    }

    return units
  }, [selectedParams, parameterMap])

  const parameterOptions = useMemo(() => {
    const groups = new Map()
    const maxUnitsReached = selectedUnits.size >= 2
    const selectedUnitsList = [...selectedUnits]
    const selectedUnitsLabel = selectedUnitsList.join(' / ')

    for (const param of parameters ?? []) {
      const unitLabel = normalizeUnitLabel(param.unit)
      const isSelected = selectedParams.includes(param.parameterLabel)
      const isDisabled = !isSelected && maxUnitsReached && !selectedUnits.has(unitLabel)
      const option = {
        value: param.parameterLabel,
        content: param.parameterLabel,
        disabled: isDisabled,
        disabledReason: isDisabled
          ? `Vous avez déjà sélectionné des paramètres avec deux unités différentes (${selectedUnitsLabel}).`
          : undefined
      }

      if (!groups.has(unitLabel)) {
        groups.set(unitLabel, [])
      }

      groups.get(unitLabel).push(option)
    }

    return [...groups.entries()].map(([unit, options]) => ({
      label: unit,
      options
    }))
  }, [parameters, selectedParams, selectedUnits])

  const handleParameterChange = useCallback(paramLabels => {
    if (paramLabels.length === 0) {
      return
    }

    const uniqueUnits = new Set()
    for (const label of paramLabels) {
      const param = parameterMap.get(label)
      if (!param) {
        continue
      }

      uniqueUnits.add(normalizeUnitLabel(param.unit))
    }

    if (uniqueUnits.size > 2) {
      return
    }

    setSelectedParams(paramLabels)
    onParameterChange?.(paramLabels)
  }, [parameterMap, onParameterChange])

  return {
    selectedParams,
    parameterOptions,
    handleParameterChange
  }
}
