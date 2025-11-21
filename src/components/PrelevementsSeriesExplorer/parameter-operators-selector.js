'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Select} from '@codegouvfr/react-dsfr/Select'
import {Box} from '@mui/material'

import {normalizeUnitLabel} from './utils/parameter-display.js'

const normalizeOperatorOptions = options => {
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
  operatorOptionsByParameter,
  defaultOperators,
  selectedOperators,
  parameterOptionMap,
  labelPrefix = 'Agrégation',
  placeholder = 'Sélectionner un opérateur',
  onChange
}) => {
  const normalizedOperatorOptionsByParam = useMemo(() => {
    const map = new Map()

    if (!operatorOptionsByParameter) {
      return map
    }

    if (operatorOptionsByParameter instanceof Map) {
      for (const [param, options] of operatorOptionsByParameter.entries()) {
        map.set(param, normalizeOperatorOptions(options))
      }
    } else {
      for (const [param, options] of Object.entries(operatorOptionsByParameter)) {
        map.set(param, normalizeOperatorOptions(options))
      }
    }

    return map
  }, [operatorOptionsByParameter])

  const resolveParameterOperators = useCallback((parametersList, baseOperators = {}) => {
    if (!Array.isArray(parametersList)) {
      return {}
    }

    const resolved = {}

    for (const param of parametersList) {
      const options = normalizedOperatorOptionsByParam.get(param) ?? []
      if (options.length === 0) {
        continue
      }

      const allowedValues = new Set(options.map(option => option.value))
      const requested = getValue(baseOperators, param)
      const defaultValue = getValue(defaultOperators, param)

      const selectedValue = allowedValues.has(requested)
        ? requested
        : (allowedValues.has(defaultValue) ? defaultValue : options[0].value)

      if (selectedValue) {
        resolved[param] = selectedValue
      }
    }

    return resolved
  }, [defaultOperators, normalizedOperatorOptionsByParam])

  const [currentParameterOperators, setCurrentParameterOperators] = useState({})

  const resolvedParameterOperators = useMemo(
    () => {
      const baseOperators = selectedOperators
        ?? (Object.keys(currentParameterOperators).length > 0 ? currentParameterOperators : null)
        ?? defaultOperators
      return resolveParameterOperators(parameters, baseOperators)
    },
    [resolveParameterOperators, parameters, selectedOperators, currentParameterOperators, defaultOperators]
  )

  useEffect(() => {
    setCurrentParameterOperators(prev => {
      const base = selectedOperators
        ?? (Object.keys(prev).length > 0 ? prev : null)
        ?? defaultOperators
      return resolveParameterOperators(parameters, base)
    })
  }, [parameters, selectedOperators, resolveParameterOperators, defaultOperators])

  const handleParameterOperatorSelection = useCallback((parameter, operator) => {
    const options = normalizedOperatorOptionsByParam.get(parameter) ?? []
    const isAllowed = options.some(option => option.value === operator)
    if (!isAllowed) {
      return
    }

    setCurrentParameterOperators(prev => {
      const base = selectedOperators
        ?? (Object.keys(prev).length > 0 ? prev : null)
        ?? defaultOperators
      const next = {...base, [parameter]: operator}

      onChange?.(next)

      if (selectedOperators) {
        return prev
      }

      return next
    })
  }, [defaultOperators, normalizedOperatorOptionsByParam, onChange, selectedOperators])

  return (
    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
      {parameters.map(param => {
        const operatorOptions = normalizedOperatorOptionsByParam.get(param) ?? []
        if (operatorOptions.length === 0) {
          return null
        }

        const selectedValue = resolvedParameterOperators?.[param] ?? ''
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
                disabled: operatorOptions.length <= 1,
                onChange: event => handleParameterOperatorSelection(param, event.target.value)
              }}
            >
              <option disabled hidden value=''>
                {placeholder}
              </option>
              {operatorOptions.map(option => (
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
