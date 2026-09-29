'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {resolveSelectedParametersDateRange} from '@/components/points-prelevement/series-date-range.js'
import {getMeterSeriesQuery, METER_SERIES_LIMIT} from '@/components/points-prelevement/meter-series.js'
import {buildChartSeriesQuery, loadChartSeries} from '@/lib/chart-series.js'
import {buildSeriesPresentations} from '@/components/points-prelevement/series-presentation.js'
import {
  resolveInitialDisplayFrequency,
  resolveSeriesDisplayFrequency
} from '@/components/points-prelevement/series-display-frequency.js'
import {getParameterFlowColor} from '@/components/PrelevementsSeriesExplorer/constants/colors.js'
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

const EMPTY_SERIES_MAP = new Map()

const DEFAULT_METRIC_TYPE_CODES = ['volume', 'débit']
const FALLBACK_VOLUME_TEMPORAL_OPERATORS = ['sum', 'mean', 'min', 'max']
const FALLBACK_STANDARD_TEMPORAL_OPERATORS = ['mean', 'min', 'max']

const useSeriesExplorer = ({
  collecteurId = null,
  endDate = null,
  pointIds = null,
  preleveurId = null,
  exploitationId = null,
  seriesOptions = null,
  startDate = null,
  subtitle = null,
  title = 'Historique des prélèvements',
  titleComponent = 'h2'
}) => {
  // Vérifie si des paramètres sont disponibles depuis l'API
  const hasParameters = seriesOptions?.parameters?.length > 0

  // Construit les options de paramètres depuis la réponse API
  const parameterOptions = useMemo(
    () => buildSeriesPresentations(seriesOptions?.parameters).map(param => {
      const metadata = getParameterMetadata(param.name)
      const metricTypeCode = param.metricTypeCode ?? param.code ?? param.name
      return {
        value: param.id ?? metricTypeCode,
        label: param.label ?? param.name,
        color: param.color ?? getParameterFlowColor(metricTypeCode, param.flowType),
        metricTypeCode,
        readingSeries: param.readingSeries === true,
        flowType: param.flowType ?? null,
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
        const metricTypeCode = param.metricTypeCode ?? param.code ?? param.name
        const parameterId = param.id ?? metricTypeCode
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

        return [parameterId, {
          ...metadata,
          ...param,
          parameter: metricTypeCode,
          metricTypeCode,
          temporalOperators,
          defaultTemporalOperator,
          unit,
          valueType
        }]
      })
    )
  }, [seriesOptions])

  // Prioritize withdrawn volume and flow rate on point details when available.
  const derivedDefaultParameters = useMemo(() => {
    const defaultParameters = DEFAULT_METRIC_TYPE_CODES
      .map(metricTypeCode => parameterOptions.find(
        option => option.metricTypeCode?.toLowerCase() === metricTypeCode
      )?.value)
      .filter(Boolean)

    if (defaultParameters.length > 0) {
      return defaultParameters
    }

    return parameterOptions[0]?.value ? [parameterOptions[0].value] : []
  }, [parameterOptions])

  const [selectedParameters, setSelectedParameters] = useState(derivedDefaultParameters)
  const [limitedScope, setLimitedScope] = useState(null)
  const [requestedMeterRange, setRequestedMeterRange] = useState(null)
  const fullDateRange = useMemo(
    () => resolveSelectedParametersDateRange({
      endDate,
      parameters: seriesOptions?.parameters,
      selectedParameters,
      startDate
    }),
    [endDate, selectedParameters, seriesOptions?.parameters, startDate]
  )
  const selectionScope = JSON.stringify([collecteurId, pointIds, preleveurId, exploitationId, selectedParameters, fullDateRange.start, fullDateRange.end])
  const dateRange = requestedMeterRange?.scope === selectionScope ? requestedMeterRange.range : fullDateRange
  const selectablePeriods = useMemo(
    () => calculateSelectablePeriodsFromDateRange(dateRange.start, dateRange.end),
    [dateRange.end, dateRange.start]
  )
  const defaultPeriods = useMemo(
    () => extractDefaultPeriodsFromDateRange(dateRange.start, dateRange.end),
    [dateRange.end, dateRange.start]
  )
  const dateRangeKey = `${dateRange.start ?? ''}:${dateRange.end ?? ''}`
  const explorerStateKey = `${selectedParameters.join('|')}:${dateRangeKey}`
  const initialDisplayFrequency = useMemo(
    () => resolveInitialDisplayFrequency({
      startDate: dateRange.start,
      endDate: dateRange.end
    }),
    [dateRange.end, dateRange.start]
  )
  const [parameterTemporalOperators, setParameterTemporalOperators] = useState({})
  const [targetDisplayFrequency, setTargetDisplayFrequency] = useState(initialDisplayFrequency)
  const [loadState, setLoadState] = useState({key: null, series: EMPTY_SERIES_MAP, error: null})
  const previousExplorerStateKeyRef = useRef(explorerStateKey)

  useEffect(() => {
    if (previousExplorerStateKeyRef.current === explorerStateKey) {
      return
    }

    previousExplorerStateKeyRef.current = explorerStateKey
    setTargetDisplayFrequency(initialDisplayFrequency)
  }, [explorerStateKey, initialDisplayFrequency])

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

    // Priority 1: Use the default operator from the metricTypeCode definition (API or metadata)
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
      if (definition?.readingSeries) {
        optionsMap[param] = []
        continue
      }
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

  const buildSeriesRequest = useCallback((parameterId, temporalOperator, frequency, range = dateRange) => {
    const parameterDefinition = parameterDefinitionMap.get(parameterId)
    const params = {
      aggregationFrequency: frequency,
      metricTypeCode: parameterDefinition?.metricTypeCode ?? parameterId,
      temporalOperator
    }

    if (parameterDefinition?.flowType) {
      params.pointFlowType = parameterDefinition.flowType
    }

    if (pointIds) {
      params.pointIds = pointIds
    }

    if (collecteurId) {
      params.collecteurId = collecteurId
    }

    if (preleveurId) {
      params.preleveurId = preleveurId
    }

    if (exploitationId || parameterDefinition?.exploitationId) {
      params.exploitationId = parameterDefinition?.exploitationId || exploitationId
    }

    if (range.start) {
      params.startDate = range.start
    }

    if (range.end) {
      params.endDate = range.end
    }

    Object.assign(params, getMeterSeriesQuery(parameterDefinition))
    return buildChartSeriesQuery(params)
  }, [collecteurId, pointIds, preleveurId, exploitationId, dateRange, parameterDefinitionMap])

  const getVolumeValuesForRange = useCallback(async (parameterId, {startDate, endDate}, {signal} = {}) => {
    // Exact totals retain the API's clipping of partial source periods.
    const query = buildSeriesRequest(parameterId, 'sum', '1 year', {
      start: startDate,
      end: endDate
    })
    const response = await loadChartSeries(query, {signal})
    if (!Array.isArray(response?.values)) {
      throw new Error('Impossible de calculer le total sur cette période')
    }
    return response.values
  }, [buildSeriesRequest])

  // Compare actual requests, including the available frequency, rather than a
  // display suggestion. A slider suggestion can resolve to the same API query.
  const requestKey = JSON.stringify(selectedParameters.flatMap(parameterId => {
    const operator = resolvedTemporalOperatorsByParameter[parameterId]
    if (!operator || !targetDisplayFrequency) return []
    const definition = parameterDefinitionMap.get(parameterId)
    const frequency = pickAvailableFrequency(targetDisplayFrequency, definition?.availableFrequencies) ?? targetDisplayFrequency
    return [[parameterId, buildSeriesRequest(parameterId, operator, frequency)]]
  }))
  const hasRequests = requestKey !== '[]'
  const isCurrent = loadState.key === requestKey
  const aggregatedSeriesMap = isCurrent ? loadState.series : EMPTY_SERIES_MAP
  const loadError = isCurrent ? loadState.error : null
  const isLoading = hasRequests && !isCurrent

  useEffect(() => {
    const requests = JSON.parse(requestKey)
    if (requests.length === 0) return undefined

    let active = true
    const controller = new AbortController()
    const pendingByQuery = new Map()
    const load = query => {
      if (!pendingByQuery.has(query)) {
        pendingByQuery.set(query, loadChartSeries(query, {signal: controller.signal}))
      }
      return pendingByQuery.get(query)
    }

    Promise.all(requests.map(async ([parameterId, query]) => {
      const response = await load(query)
      return [parameterId, {
        ...response,
        metadata: {
          ...response?.metadata,
          frequency: response?.metadata?.frequency ?? new URLSearchParams(query).get('aggregationFrequency')
        }
      }]
    })).then(entries => {
      if (active) setLoadState({key: requestKey, series: new Map(entries), error: null})
    }).catch(error => {
      if (!active || error?.name === 'AbortError') return
      controller.abort()
      if (error?.code === METER_SERIES_LIMIT) setLimitedScope(selectionScope)
      setLoadState({
        key: requestKey,
        series: EMPTY_SERIES_MAP,
        error: error instanceof Error ? error.message : 'Impossible de charger les séries agrégées'
      })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestKey, selectionScope])

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

      setSelectedParameters(parameters)
      nextParameters = parameters
    }

    if (nextParameterTemporalOperators !== undefined) {
      setParameterTemporalOperators(buildTemporalOperatorsForParameters(nextParameters, nextParameterTemporalOperators))
    }
  }, [buildTemporalOperatorsForParameters, parameterDefinitionMap, selectedParameters])

  const handleDisplayResolutionChange = useCallback(frequency => {
    if (frequency) {
      setTargetDisplayFrequency(resolveSeriesDisplayFrequency({
        endDate: dateRange.end,
        startDate: dateRange.start,
        suggestedFrequency: frequency
      }))
    }
  }, [dateRange.end, dateRange.start])

  return {
    hasParameters, title, titleComponent, subtitle, limitedScope, selectionScope,
    fullDateRange, dateRange,
    onMeterRangeApply: range => setRequestedMeterRange({scope: selectionScope, range}),
    selectedParameters, explorerStateKey, aggregatedSeriesMap, parameterOptions,
    derivedDefaultParameters, temporalOperatorOptionsByParameter,
    resolvedTemporalOperatorsByParameter, defaultTemporalOperatorsByParameter,
    selectablePeriods, defaultPeriods, getVolumeValuesForRange,
    loadError, isLoading, seriesOptions, handleFiltersChange,
    handleDisplayResolutionChange, parameterDefinitionMap
  }
}

export default useSeriesExplorer
