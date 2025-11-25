'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Select} from '@codegouvfr/react-dsfr/Select'
import {Box} from '@mui/material'

import {normalizeUnitLabel} from './utils/parameter-display.js'

const normalizeTemporalOperatorOptions = options => {
  if (!options) {
    return []
  }

  return options
    .map(option => {
      if (!option) {
        return null
      }

      if (typeof option === 'string') {
        return {
          value: option,
          label: option
        }
      }

      if (typeof option === 'object') {
        const value = option.value ?? option.label
        if (!value) {
          return null
        }

        return {
          value,
          label: option.label ?? value,
          disabled: option.disabled,
          disabledReason: option.disabledReason
        }
      }

      return null
    })
    .filter(Boolean)
}

const getValue = (source, key) => {
  if (!source) {
    return undefined
  }

  if (source instanceof Map) {
    return source.get(key)
  }

  return source[key]
}

const ParameterOperatorsSelector = ({
  parameters = [],
  temporalOperatorOptionsByParameter,
  defaultTemporalOperators,
  selectedTemporalOperators,
  parameterOptionMap,
  labelPrefix = 'Agrégation',
  placeholder = 'Sélectionner un opérateur',
  onChange
}) => {
  const normalizedTemporalOperatorOptionsByParam = useMemo(() => {
    const map = new Map()

    if (!temporalOperatorOptionsByParameter) {
      return map
    }

    if (temporalOperatorOptionsByParameter instanceof Map) {
      for (const [param, options] of temporalOperatorOptionsByParameter.entries()) {
        map.set(param, normalizeTemporalOperatorOptions(options))
      }
    } else {
      for (const [param, options] of Object.entries(temporalOperatorOptionsByParameter)) {
        map.set(param, normalizeTemporalOperatorOptions(options))
      }
    }

    return map
  }, [temporalOperatorOptionsByParameter])

  const resolveParameterTemporalOperators = useCallback((parametersList, baseTemporalOperators = {}) => {
    if (!Array.isArray(parametersList)) {
      return {}
    }

    const resolved = {}

    for (const param of parametersList) {
      const options = normalizedTemporalOperatorOptionsByParam.get(param) ?? []
      if (options.length === 0) {
        continue
      }

      const allowedValues = new Set(options.map(option => option.value))
      const requested = getValue(baseTemporalOperators, param)
      const defaultValue = getValue(defaultTemporalOperators, param)

      const selectedValue = allowedValues.has(requested)
        ? requested
        : (allowedValues.has(defaultValue) ? defaultValue : options[0].value)

      if (selectedValue) {
        resolved[param] = selectedValue
      }
    }

    return resolved
  }, [defaultTemporalOperators, normalizedTemporalOperatorOptionsByParam])

  const [currentParameterTemporalOperators, setCurrentParameterTemporalOperators] = useState({})

  const resolvedParameterTemporalOperators = useMemo(
    () => {
      const baseTemporalOperators = selectedTemporalOperators
        ?? (Object.keys(currentParameterTemporalOperators).length > 0 ? currentParameterTemporalOperators : null)
        ?? defaultTemporalOperators
      return resolveParameterTemporalOperators(parameters, baseTemporalOperators)
    },
    [resolveParameterTemporalOperators, parameters, selectedTemporalOperators, currentParameterTemporalOperators, defaultTemporalOperators]
  )

  useEffect(() => {
    setCurrentParameterTemporalOperators(prev => {
      const base = selectedTemporalOperators
        ?? (Object.keys(prev).length > 0 ? prev : null)
        ?? defaultTemporalOperators
      return resolveParameterTemporalOperators(parameters, base)
    })
  }, [parameters, selectedTemporalOperators, resolveParameterTemporalOperators, defaultTemporalOperators])

  const handleParameterTemporalOperatorSelection = useCallback((parameter, temporalOperator) => {
    const options = normalizedTemporalOperatorOptionsByParam.get(parameter) ?? []
    const isAllowed = options.some(option => option.value === temporalOperator)
    if (!isAllowed) {
      return
    }

    const base = selectedTemporalOperators
      ?? (Object.keys(currentParameterTemporalOperators).length > 0 ? currentParameterTemporalOperators : null)
      ?? defaultTemporalOperators
    const next = {...base, [parameter]: temporalOperator}

    // Defer onChange call to avoid updating parent during render
    queueMicrotask(() => {
      onChange?.(next)
    })

    if (!selectedTemporalOperators) {
      setCurrentParameterTemporalOperators(next)
    }
  }, [currentParameterTemporalOperators, defaultTemporalOperators, normalizedTemporalOperatorOptionsByParam, onChange, selectedTemporalOperators])

  return (
    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
      {parameters.map(param => {
        const temporalOperatorOptions = normalizedTemporalOperatorOptionsByParam.get(param) ?? []
        if (temporalOperatorOptions.length === 0) {
          return null
        }

        const selectedValue = resolvedParameterTemporalOperators?.[param] ?? ''
        const optionMetadata = parameterOptionMap?.get ? parameterOptionMap.get(param) : null
        const normalizedUnit = optionMetadata?.unit ? normalizeUnitLabel(optionMetadata.unit) : ''
        const parameterLabel = optionMetadata?.label ?? param
        const label = normalizedUnit
          ? `${labelPrefix} ${parameterLabel} (${normalizedUnit})`
          : `${labelPrefix} ${parameterLabel}`

        return (
          <Box
            key={param}
            sx={{
              flex: '1 1 220px',
              minWidth: 220
            }}
          >
            <Select
              label={label}
              nativeSelectProps={{
                value: selectedValue,
                disabled: temporalOperatorOptions.length <= 1,
                onChange: event => handleParameterTemporalOperatorSelection(param, event.target.value)
              }}
            >
              <option disabled hidden value=''>
                {placeholder}
              </option>
              {temporalOperatorOptions.map(option => (
                <option
                  key={option.value}
                  disabled={option.disabled}
                  value={option.value}
                  title={option.disabledReason}
                >
                  {option.label}
                </option>
              ))}
            </Select>
          </Box>
        )
      })}
    </Box>
  )
}

export default ParameterOperatorsSelector
