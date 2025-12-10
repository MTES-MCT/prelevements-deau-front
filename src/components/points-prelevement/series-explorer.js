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
const FALLBACK_VOLUME_TEMPORAL_OPERATORS = ['sum', 'mean', 'min', 'max']
const FALLBACK_STANDARD_TEMPORAL_OPERATORS = ['mean', 'min', 'max']

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
        const fallbackTemporalOperators = normalizedName.includes('volume')
          ? FALLBACK_VOLUME_TEMPORAL_OPERATORS
          : FALLBACK_STANDARD_TEMPORAL_OPERATORS

        const temporalOperatorSource = (() => {
          if (Array.isArray(param.temporalOperators) && param.temporalOperators.length > 0) {
            return param.temporalOperators
          }

          if (Array.isArray(metadata.temporalOperators) && metadata.temporalOperators.length > 0) {
            return metadata.temporalOperators
          }

          return fallbackTemporalOperators
        })()

        const temporalOperators = [...new Set(temporalOperatorSource)].filter(Boolean)

        const unit = param.unit ?? metadata.unit ?? ''
        const valueType = param.valueType ?? metadata.valueType ?? metadata.type ?? null
        const defaultTemporalOperator = param.defaultTemporalOperator
          ?? metadata.defaultTemporalOperator
          ?? temporalOperators[0]

        return [param.name, {
          ...metadata,
          ...param,
          parameter: param.name,
          temporalOperators,
          defaultTemporalOperator,
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
  const [parameterTemporalOperators, setParameterTemporalOperators] = useState({})
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

  const resolveDefaultTemporalOperatorForParameter = useCallback((parameterName, definition) => {
    const parameterDefinition = definition ?? parameterDefinitionMap.get(parameterName) ?? getParameterMetadata(parameterName)
    if (!parameterDefinition) {
      return null
    }

    // Priority 1: Use the default operator from the parameter definition (API or metadata)
    if (parameterDefinition.defaultTemporalOperator) {
      return parameterDefinition.defaultTemporalOperator
    }

    // Priority 2: Fall back to first available operator
    return parameterDefinition.temporalOperators?.[0] ?? null
  }, [parameterDefinitionMap])

  const buildTemporalOperatorsForParameters = useCallback((parametersList, baseTemporalOperators = {}) => {
    if (!Array.isArray(parametersList)) {
      return {}
    }

    const result = {}

    for (const param of parametersList) {
      const definition = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
      const availableTemporalOperators = definition?.temporalOperators ?? []
      const requestedTemporalOperator = baseTemporalOperators[param]
      const defaultTemporalOperator = resolveDefaultTemporalOperatorForParameter(param, definition)

      const selectedTemporalOperator = availableTemporalOperators.includes(requestedTemporalOperator)
        ? requestedTemporalOperator
        : (availableTemporalOperators.includes(defaultTemporalOperator) ? defaultTemporalOperator : availableTemporalOperators[0])

      if (selectedTemporalOperator) {
        result[param] = selectedTemporalOperator
      }
    }

    return result
  }, [parameterDefinitionMap, resolveDefaultTemporalOperatorForParameter])

  const temporalOperatorOptionsByParameter = useMemo(() => {
    if (selectedParameters.length === 0) {
      return {}
    }

    const optionsMap = {}

    for (const param of selectedParameters) {
      const definition = parameterDefinitionMap.get(param) ?? getParameterMetadata(param)
      const temporalOperators = definition?.temporalOperators ?? []
      optionsMap[param] = temporalOperators.map(temporalOperator => ({
        value: temporalOperator,
        label: OPERATOR_LABELS[temporalOperator] ?? temporalOperator.toUpperCase()
      }))
    }

    return optionsMap
  }, [parameterDefinitionMap, selectedParameters])

  useEffect(() => {
    if (selectedParameters.length === 0) {
      setParameterTemporalOperators({})
      return
    }

    // Use buildTemporalOperatorsForParameters directly to avoid code duplication
    setParameterTemporalOperators(prev => buildTemporalOperatorsForParameters(selectedParameters, prev))
  }, [selectedParameters, parameterDefinitionMap, buildTemporalOperatorsForParameters])

  const resolvedTemporalOperatorsByParameter = useMemo(
    () => buildTemporalOperatorsForParameters(selectedParameters, parameterTemporalOperators),
    [buildTemporalOperatorsForParameters, parameterTemporalOperators, selectedParameters]
  )

  const defaultTemporalOperatorsByParameter = useMemo(
    () => buildTemporalOperatorsForParameters(selectedParameters, {}),
    [buildTemporalOperatorsForParameters, selectedParameters]
  )

  const fetchAggregatedSeries = useCallback(async (parameter, temporalOperator, frequency, requestOptions = {}) => {
    const params = {
      aggregationFrequency: frequency,
      parameter,
      temporalOperator
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

    const allTemporalOperatorsResolved = selectedParameters.every(param => resolvedTemporalOperatorsByParameter[param])

    let isActive = true
    const abortController = new AbortController()

    if (!allTemporalOperatorsResolved) {
      setIsLoading(false)
      return () => {
        abortController.abort()
      }
    }

    // Clear stale data immediately to prevent rendering old data during fetch
    // This prevents the UI freeze caused by rendering large datasets from previous selections
    // Note: The map is also cleared in handleFiltersChange for synchronous batching,
    // but we keep this here for cases where useEffect triggers without going through the handler
    setAggregatedSeriesMap(prev => {
      // Only clear if there are stale entries that don't match current selection
      const hasStaleData = [...prev.keys()].some(key => !selectedParameters.includes(key))
      return hasStaleData ? new Map() : prev
    })
    setIsLoading(true)
    setLoadError(null)

    const loadAllSeries = async () => {
      try {
        const promises = selectedParameters.map(async param => {
          const temporalOperator = resolvedTemporalOperatorsByParameter[param]
          // Skip fetch if temporalOperator cannot be resolved for this parameter
          if (!temporalOperator) {
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
            temporalOperator,
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
  }, [selectedParameters, resolvedTemporalOperatorsByParameter, targetDisplayFrequency, fetchAggregatedSeries, parameterDefinitionMap])

  const handleFiltersChange = useCallback(({parameters, parameterTemporalOperators: nextParameterTemporalOperators}) => {
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

      // Clear the map immediately to prevent rendering stale data during the transition
      // This must happen in the same event handler to be batched with setSelectedParameters
      setAggregatedSeriesMap(new Map())
      setSelectedParameters(parameters)
      nextParameters = parameters
    }

    if (nextParameterTemporalOperators !== undefined) {
      setParameterTemporalOperators(buildTemporalOperatorsForParameters(nextParameters, nextParameterTemporalOperators))
    }
  }, [buildTemporalOperatorsForParameters, parameterDefinitionMap, selectedParameters])

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
          temporalOperatorOptionsByParameter={temporalOperatorOptionsByParameter}
          selectedTemporalOperators={resolvedTemporalOperatorsByParameter}
          defaultTemporalOperators={defaultTemporalOperatorsByParameter}
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
