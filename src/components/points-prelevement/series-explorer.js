'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import {getAggregatedSeries} from '@/app/api/series.js'
import AggregatedSeriesExplorer from '@/components/PrelevementsSeriesExplorer/aggregated-series-explorer.js'
import {
  getParameterMetadata,
  MAX_DIFFERENT_UNITS,
  OPERATOR_LABELS
} from '@/components/PrelevementsSeriesExplorer/constants/parameters.js'
import {
  calculateSelectablePeriodsFromDateRange,
  extractDefaultPeriodsFromDateRange
} from '@/components/PrelevementsSeriesExplorer/utils/date-range-periods.js'
import {pickAvailableFrequency} from '@/utils/frequency.js'

const DEFAULT_FREQUENCY = '1 day'
const DEFAULT_PARAMETER = 'volume prélevé'
const DEFAULT_OPERATOR_FOR_VOLUME = 'sum'
const FALLBACK_VOLUME_OPERATORS = ['sum', 'mean', 'min', 'max']
const FALLBACK_STANDARD_OPERATORS = ['mean', 'min', 'max']

const SeriesExplorer = ({pointIds = null, preleveurId = null, seriesOptions = null, startDate = null, endDate = null}) => {
  // Vérifie si des paramètres sont disponibles depuis l'API
  const hasParameters = seriesOptions?.parameters?.length > 0

  // Compute dateRange: use explicit startDate/endDate props if provided,
  // otherwise fall back to extracting min/max dates from seriesOptions.parameters.
  const dateRange = useMemo(() => {
    if (startDate && endDate) {
      return {start: startDate, end: endDate}
    }

    // Compute from seriesOptions parameters
    if (!seriesOptions?.parameters || seriesOptions.parameters.length === 0) {
      return {start: null, end: null}
    }

    let minDate = null
    let maxDate = null

    for (const param of seriesOptions.parameters) {
      if (param.minDate && (!minDate || param.minDate < minDate)) {
        minDate = param.minDate
      }

      if (param.maxDate && (!maxDate || param.maxDate > maxDate)) {
        maxDate = param.maxDate
      }
    }

    return {start: minDate, end: maxDate}
  }, [startDate, endDate, seriesOptions])

  // Calcule les périodes sélectionnables en tenant compte de startDate/endDate
  const selectablePeriods = useMemo(
    () => calculateSelectablePeriodsFromDateRange(dateRange.start, dateRange.end),
    [dateRange]
  )

  // Calcule les périodes par défaut en tenant compte de startDate/endDate
  const defaultPeriods = useMemo(
    () => extractDefaultPeriodsFromDateRange(dateRange.start, dateRange.end),
    [dateRange]
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
  const [parameterOperators, setParameterOperators] = useState({})
  const [targetDisplayFrequency, setTargetDisplayFrequency] = useState(DEFAULT_FREQUENCY)
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

  const resolveDefaultOperatorForParameter = useCallback((parameterName, definition) => {
    const parameterDefinition = definition ?? parameterDefinitionMap.get(parameterName) ?? getParameterMetadata(parameterName)
    if (!parameterDefinition) {
      return null
    }

    const operators = parameterDefinition.operators ?? []
    const isVolumeParameter = parameterName?.toLowerCase().includes('volume')

    if (isVolumeParameter && operators.includes(DEFAULT_OPERATOR_FOR_VOLUME)) {
      return DEFAULT_OPERATOR_FOR_VOLUME
    }

    return parameterDefinition.defaultOperator
      ?? operators[0]
      ?? null
  }, [parameterDefinitionMap])

  const buildOperatorsForParameters = useCallback((parametersList, baseOperators = {}) => {
    if (!Array.isArray(parametersList)) {
      return {}
    }

    const result = {}

    for (const param of parametersList) {
      const definition = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
      const availableOperators = definition?.operators ?? []
      const requestedOperator = baseOperators[param]
      const defaultOperator = resolveDefaultOperatorForParameter(param, definition)

      const selectedOperator = availableOperators.includes(requestedOperator)
        ? requestedOperator
        : (availableOperators.includes(defaultOperator) ? defaultOperator : availableOperators[0])

      if (selectedOperator) {
        result[param] = selectedOperator
      }
    }

    return result
  }, [parameterDefinitionMap, resolveDefaultOperatorForParameter])

  const operatorOptionsByParameter = useMemo(() => {
    if (selectedParameters.length === 0) {
      return {}
    }

    const optionsMap = {}

    for (const param of selectedParameters) {
      const definition = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
      const operators = definition?.operators ?? []
      optionsMap[param] = operators.map(operator => ({
        value: operator,
        label: OPERATOR_LABELS[operator] ?? operator.toUpperCase()
      }))
    }

    return optionsMap
  }, [parameterDefinitionMap, selectedParameters])

  useEffect(() => {
    if (selectedParameters.length === 0) {
      setParameterOperators({})
      return
    }

    // Use buildOperatorsForParameters directly to avoid code duplication
    setParameterOperators(prev => buildOperatorsForParameters(selectedParameters, prev))
  }, [selectedParameters, parameterDefinitionMap, buildOperatorsForParameters])

  const resolvedOperatorsByParameter = useMemo(
    () => buildOperatorsForParameters(selectedParameters, parameterOperators),
    [buildOperatorsForParameters, parameterOperators, selectedParameters]
  )

  const defaultOperatorsByParameter = useMemo(
    () => buildOperatorsForParameters(selectedParameters, {}),
    [buildOperatorsForParameters, selectedParameters]
  )

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

    if (dateRange.start) {
      params.startDate = dateRange.start
    }

    if (dateRange.end) {
      params.endDate = dateRange.end
    }

    return getAggregatedSeries(params, requestOptions)
  }, [pointIds, preleveurId, dateRange])

  useEffect(() => {
    // Clear the map only when no parameters are selected
    if (selectedParameters.length === 0) {
      setAggregatedSeriesMap(new Map())
      setIsLoading(false)
      return
    }

    // Don't load if frequency is missing
    if (!targetDisplayFrequency) {
      return
    }

    const allOperatorsResolved = selectedParameters.every(param => resolvedOperatorsByParameter[param])

    let isActive = true
    const abortController = new AbortController()

    if (!allOperatorsResolved) {
      setIsLoading(false)
      return () => {
        abortController.abort()
      }
    }

    setIsLoading(true)
    setLoadError(null)

    const loadAllSeries = async () => {
      try {
        const promises = selectedParameters.map(async param => {
          const operator = resolvedOperatorsByParameter[param]
          // Skip fetch if operator cannot be resolved for this parameter
          if (!operator) {
            return [param, null]
          }

          const parameterDefinition = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
          const availableFrequencies = parameterDefinition?.availableFrequencies
          const chosenFrequency = pickAvailableFrequency(
            targetDisplayFrequency,
            availableFrequencies
          ) ?? targetDisplayFrequency ?? DEFAULT_FREQUENCY

          const response = await fetchAggregatedSeries(
            param,
            operator,
            chosenFrequency,
            {signal: abortController.signal}
          )

          const normalizedResponse = response && typeof response === 'object'
            ? {
              ...response,
              metadata: {
                ...response.metadata,
                frequency: response?.metadata?.frequency ?? chosenFrequency
              }
            }
            : response

          return [param, normalizedResponse]
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
  }, [selectedParameters, resolvedOperatorsByParameter, targetDisplayFrequency, fetchAggregatedSeries, parameterDefinitionMap])

  const handleFiltersChange = useCallback(({parameters, parameterOperators: nextParameterOperators}) => {
    let nextParameters = selectedParameters

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
      nextParameters = parameters
    }

    if (nextParameterOperators !== undefined) {
      setParameterOperators(buildOperatorsForParameters(nextParameters, nextParameterOperators))
    }
  }, [buildOperatorsForParameters, parameterDefinitionMap, selectedParameters])

  const handleDisplayResolutionChange = useCallback(frequency => {
    if (frequency) {
      setTargetDisplayFrequency(frequency)
    }
  }, [])

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
          operatorOptionsByParameter={operatorOptionsByParameter}
          selectedOperators={resolvedOperatorsByParameter}
          defaultOperators={defaultOperatorsByParameter}
          selectablePeriods={selectablePeriods}
          defaultPeriods={defaultPeriods}
          error={loadError}
          isLoading={isLoading}
          onFiltersChange={handleFiltersChange}
          onDisplayResolutionChange={handleDisplayResolutionChange}
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
