'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import {getAggregatedSeries} from '@/app/api/series.js'
import AggregatedSeriesExplorer from '@/components/PrelevementsSeriesExplorer/aggregated-series-explorer.js'
import {
  FREQUENCY_OPTIONS,
  getParameterMetadata,
  MAX_DIFFERENT_UNITS,
  OPERATOR_LABELS
} from '@/components/PrelevementsSeriesExplorer/constants/parameters.js'
import {
  calculateSelectablePeriodsFromDateRange,
  extractDefaultPeriodsFromDateRange
} from '@/components/PrelevementsSeriesExplorer/utils/date-range-periods.js'

const DEFAULT_FREQUENCY = '1 day'
const DEFAULT_PARAMETER = 'volume prélevé'
const DEFAULT_OPERATOR_FOR_VOLUME = 'sum'
const FALLBACK_VOLUME_OPERATORS = ['sum', 'mean', 'min', 'max']
const FALLBACK_STANDARD_OPERATORS = ['mean', 'min', 'max']

const SeriesExplorer = ({pointIds = null, preleveurId = null, seriesOptions = null, startDate = null, endDate = null}) => {
  // Vérifie si des paramètres sont disponibles depuis l'API
  const hasParameters = seriesOptions?.parameters?.length > 0

  // Calcule les périodes sélectionnables en tenant compte de startDate/endDate
  const selectablePeriods = useMemo(
    () => calculateSelectablePeriodsFromDateRange(startDate, endDate),
    [startDate, endDate]
  )

  // Calcule les périodes par défaut en tenant compte de startDate/endDate
  const defaultPeriods = useMemo(
    () => extractDefaultPeriodsFromDateRange(startDate, endDate),
    [startDate, endDate]
  )

  // Construit les options de paramètres depuis la réponse API
  const parameterOptions = useMemo(
    () => (seriesOptions?.parameters ?? []).map(param => {
      const metadata = getParameterMetadata(param.name)
      return {
        value: param.name,
        label: param.name,
        unit: param.unit ?? metadata?.unit ?? '',
        valueType: param.valueType ?? metadata?.valueType ?? metadata?.type ?? null
      }
    }),
    [seriesOptions]
  )

  const parameterDefinitionMap = useMemo(() => {
    if (!seriesOptions?.parameters) {
      return new Map()
    }

    return new Map(
      seriesOptions.parameters.map(param => {
        const metadata = getParameterMetadata(param.name) ?? {}
        const normalizedName = param.name?.toLowerCase() ?? ''
        const fallbackOperators = normalizedName.includes('volume')
          ? FALLBACK_VOLUME_OPERATORS
          : FALLBACK_STANDARD_OPERATORS

        const operatorSource = (() => {
          if (Array.isArray(param.operators) && param.operators.length > 0) {
            return param.operators
          }

          if (Array.isArray(metadata.operators) && metadata.operators.length > 0) {
            return metadata.operators
          }

          return fallbackOperators
        })()

        const operators = [...new Set(operatorSource)].filter(Boolean)

        const unit = param.unit ?? metadata.unit ?? ''
        const valueType = param.valueType ?? metadata.valueType ?? metadata.type ?? null
        const defaultOperator = param.defaultOperator
          ?? metadata.defaultOperator
          ?? operators[0]
          ?? (normalizedName.includes('volume') ? DEFAULT_OPERATOR_FOR_VOLUME : fallbackOperators[0])

        return [param.name, {
          ...metadata,
          ...param,
          parameter: param.name,
          operators,
          defaultOperator,
          unit,
          valueType
        }]
      })
    )
  }, [seriesOptions])

  // Prioritize 'volume prélevé' as default parameter if available
  const derivedDefaultParameters = useMemo(() => {
    // Priority 1: Check if 'volume prélevé' is available
    const volumeParameter = parameterOptions.find(
      opt => opt.value?.toLowerCase() === DEFAULT_PARAMETER.toLowerCase()
    )

    if (volumeParameter) {
      return [volumeParameter.value]
    }

    // Priority 2: Fallback to first available parameter
    return parameterOptions[0]?.value ? [parameterOptions[0].value] : []
  }, [parameterOptions])

  const [selectedParameters, setSelectedParameters] = useState(derivedDefaultParameters)
  const [selectedOperator, setSelectedOperator] = useState(null)
  const [selectedFrequency, setSelectedFrequency] = useState(DEFAULT_FREQUENCY)
  const [aggregatedSeriesMap, setAggregatedSeriesMap] = useState(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (parameterOptions.length === 0 || derivedDefaultParameters.length === 0) {
      setSelectedParameters([])
      return
    }

    setSelectedParameters(prev => {
      // Keep only valid selections
      const validSelections = prev.filter(p =>
        parameterOptions.some(option => option.value === p)
      )
      return validSelections.length > 0 ? validSelections : derivedDefaultParameters
    })
  }, [parameterOptions, derivedDefaultParameters])

  // Get definitions for all selected parameters
  const currentParameterDefinitions = useMemo(() => {
    if (selectedParameters.length === 0) {
      return []
    }

    return selectedParameters
      .map(param =>
        parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
      )
      .filter(Boolean)
  }, [selectedParameters, parameterDefinitionMap])

  // For operator selection, use the first parameter's definition
  const currentParameterDefinition = currentParameterDefinitions[0] ?? null

  const operatorOptions = useMemo(
    () => currentParameterDefinition?.operators ?? [],
    [currentParameterDefinition]
  )

  // Force 'sum' operator for volume parameters
  const resolvedDefaultOperator = useMemo(() => {
    if (!currentParameterDefinition) {
      return null
    }

    // Check if first parameter is a volume parameter
    const isVolumeParameter = selectedParameters[0]?.toLowerCase().includes('volume')
    if (isVolumeParameter && currentParameterDefinition.operators?.includes(DEFAULT_OPERATOR_FOR_VOLUME)) {
      return DEFAULT_OPERATOR_FOR_VOLUME
    }

    // Use parameter's default operator or fallback to first available
    return currentParameterDefinition.defaultOperator
      ?? operatorOptions[0]
      ?? null
  }, [currentParameterDefinition, operatorOptions, selectedParameters])

  useEffect(() => {
    if (operatorOptions.length === 0) {
      setSelectedOperator(null)
      return
    }

    setSelectedOperator(prev => {
      if (prev && operatorOptions.includes(prev)) {
        return prev
      }

      return resolvedDefaultOperator
    })
  }, [operatorOptions, resolvedDefaultOperator])

  const operatorSelectOptions = useMemo(() => operatorOptions.map(operator => ({
    value: operator,
    label: OPERATOR_LABELS[operator] ?? operator.toUpperCase()
  })), [operatorOptions])

  const resolvedOperator = selectedOperator ?? resolvedDefaultOperator ?? null

  const fetchAggregatedSeries = useCallback(async (parameter, operator, frequency, requestOptions = {}) => {
    const params = {
      aggregationFrequency: frequency,
      parameter,
      operator
    }

    if (pointIds) {
      params.pointIds = pointIds
    }

    if (preleveurId) {
      params.preleveurId = preleveurId
    }

    if (startDate) {
      params.startDate = startDate
    }

    if (endDate) {
      params.endDate = endDate
    }

    return getAggregatedSeries(params, requestOptions)
  }, [pointIds, preleveurId, startDate, endDate])

  useEffect(() => {
    // Clear the map only when no parameters are selected
    if (selectedParameters.length === 0) {
      setAggregatedSeriesMap(new Map())
      setIsLoading(false)
      return
    }

    // Don't load if frequency is missing
    if (!selectedFrequency) {
      return
    }

    const operatorForFetch = resolvedOperator ?? resolvedDefaultOperator ?? null

    // When the operator is still being derived (after a parameter change), show
    // a loading state but keep the previous data visible.
    if (!operatorForFetch) {
      setIsLoading(true)
      setLoadError(null)
      return
    }

    let isActive = true
    const abortController = new AbortController()

    setIsLoading(true)
    setLoadError(null)

    const loadAllSeries = async () => {
      try {
        const promises = selectedParameters.map(async param => {
          const response = await fetchAggregatedSeries(
            param,
            operatorForFetch,
            selectedFrequency,
            {signal: abortController.signal}
          )
          return [param, response]
        })

        const results = await Promise.all(promises)

        if (isActive) {
          setAggregatedSeriesMap(new Map(results))
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }

        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Impossible de charger les séries agrégées')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadAllSeries()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [selectedParameters, resolvedOperator, resolvedDefaultOperator, selectedFrequency, fetchAggregatedSeries])

  const handleFiltersChange = useCallback(({parameters, operator, frequency}) => {
    // Handle parameters change (multi-select)
    if (parameters !== undefined && Array.isArray(parameters)) {
      // Validate units
      const units = new Set(
        parameters
          .map(param => {
            const def = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
            return def?.unit
          })
          .filter(Boolean)
      )

      if (units.size > MAX_DIFFERENT_UNITS) {
        return
      }

      setSelectedParameters(parameters)

      // Update operator if needed
      if (parameters.length > 0) {
        const nextDefinition = parameterDefinitionMap.get(parameters[0])
          ?? getParameterMetadata(parameters[0])
        const nextDefaultOperator = nextDefinition?.defaultOperator
          ?? nextDefinition?.operators?.[0]
          ?? null

        if (nextDefinition) {
          const availableOperators = nextDefinition.operators ?? []
          const isCurrentOperatorValid = selectedOperator && availableOperators.includes(selectedOperator)

          if (!isCurrentOperatorValid) {
            setSelectedOperator(nextDefaultOperator)
          }
        }
      }
    }

    // Handle operator change
    if (operator !== undefined && operator !== selectedOperator && operatorOptions.includes(operator)) {
      setSelectedOperator(operator)
    }

    // Handle frequency change
    if (
      frequency !== undefined
      && frequency !== selectedFrequency
      && FREQUENCY_OPTIONS.some(opt => opt.value === frequency)
    ) {
      setSelectedFrequency(frequency)
    }
  }, [parameterDefinitionMap, selectedOperator, operatorOptions, selectedFrequency])

  return hasParameters ? (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' component='h2'>
        Historique des prélèvements
      </Typography>

      {selectedParameters.length > 0 && (
        <AggregatedSeriesExplorer
          showRangeSlider
          showPeriodSelector={false}
          showCalendar={false}
          series={aggregatedSeriesMap}
          parameters={parameterOptions}
          selectedParameters={selectedParameters}
          defaultParameters={derivedDefaultParameters}
          operatorOptions={operatorSelectOptions}
          selectedOperator={resolvedOperator ?? undefined}
          defaultOperator={resolvedDefaultOperator ?? undefined}
          frequencyOptions={FREQUENCY_OPTIONS}
          selectedFrequency={selectedFrequency}
          defaultFrequency={DEFAULT_FREQUENCY}
          selectablePeriods={selectablePeriods}
          defaultPeriods={defaultPeriods}
          error={loadError}
          isLoading={isLoading}
          onFiltersChange={handleFiltersChange}
        />
      )}
    </Box>
  ) : (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' component='h2'>
        Historique des prélèvements
      </Typography>

      <Alert
        severity='info'
        description='Aucun prélèvement connu pour cette entité.'
      />
    </Box>
  )
}

export default SeriesExplorer
