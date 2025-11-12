'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import {getAggregatedSeries} from '@/app/api/series.js'
import AggregatedSeriesExplorer from '@/components/PrelevementsSeriesExplorer/aggregated-series-explorer.js'
import {FREQUENCY_OPTIONS, getParameterMetadata, OPERATOR_LABELS} from '@/components/PrelevementsSeriesExplorer/constants/parameters.js'
import {
  calculateSelectablePeriodsFromDateRange,
  extractDefaultPeriodsFromDateRange
} from '@/components/PrelevementsSeriesExplorer/utils/date-range-periods.js'

const DEFAULT_FREQUENCY = '1 day'

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
    () => (seriesOptions?.parameters ?? []).map(param => ({
      value: param.name,
      label: param.name
    })),
    [seriesOptions]
  )

  const parameterDefinitionMap = useMemo(() => {
    if (!seriesOptions?.parameters) {
      return new Map()
    }

    return new Map(
      seriesOptions.parameters.map(param => {
        const metadata = getParameterMetadata(param.name)
        return [param.name, {
          ...metadata,
          ...param,
          parameter: param.name
        }]
      })
    )
  }, [seriesOptions])

  const derivedDefaultParameter = parameterOptions[0]?.value ?? null

  const [selectedParameter, setSelectedParameter] = useState(derivedDefaultParameter)
  const [selectedOperator, setSelectedOperator] = useState(null)
  const [selectedFrequency, setSelectedFrequency] = useState(DEFAULT_FREQUENCY)
  const [aggregatedSeries, setAggregatedSeries] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (parameterOptions.length === 0 || !derivedDefaultParameter) {
      setSelectedParameter(null)
      return
    }

    setSelectedParameter(prev => {
      const isValid = parameterOptions.some(option => option.value === prev)
      return isValid ? prev : derivedDefaultParameter
    })
  }, [parameterOptions, derivedDefaultParameter])

  const currentParameterDefinition = useMemo(() => {
    if (!selectedParameter) {
      return null
    }

    return parameterDefinitionMap.get(selectedParameter)
      ?? getParameterMetadata(selectedParameter)
  }, [selectedParameter, parameterDefinitionMap])

  const operatorOptions = useMemo(
    () => currentParameterDefinition?.operators ?? [],
    [currentParameterDefinition]
  )
  const resolvedDefaultOperator = currentParameterDefinition?.defaultOperator
    ?? operatorOptions[0]
    ?? null

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

  const fetchAggregatedSeries = useCallback(async (parameter, operator, frequency) => {
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

    return getAggregatedSeries(params)
  }, [pointIds, preleveurId, startDate, endDate])

  useEffect(() => {
    if (!selectedParameter || !resolvedOperator || !selectedFrequency) {
      setAggregatedSeries(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    const loadSeries = async () => {
      try {
        const response = await fetchAggregatedSeries(selectedParameter, resolvedOperator, selectedFrequency)
        if (!cancelled) {
          setAggregatedSeries(response)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Impossible de charger les séries agrégées')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadSeries()

    return () => {
      cancelled = true
    }
  }, [selectedParameter, resolvedOperator, selectedFrequency, fetchAggregatedSeries])

  const handleFiltersChange = useCallback(({parameter, operator, frequency}) => {
    // Handle parameter change
    if (parameter !== undefined && parameter !== selectedParameter) {
      const nextDefinition = parameterDefinitionMap.get(parameter)
        ?? getParameterMetadata(parameter)
      const nextDefaultOperator = nextDefinition?.defaultOperator
        ?? nextDefinition?.operators?.[0]
        ?? null

      setSelectedParameter(parameter)

      if (nextDefinition) {
        const availableOperators = nextDefinition.operators ?? []
        const isCurrentOperatorValid = selectedOperator && availableOperators.includes(selectedOperator)

        if (!isCurrentOperatorValid) {
          setSelectedOperator(nextDefaultOperator)
        }
      } else {
        setSelectedOperator(null)
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
  }, [parameterDefinitionMap, selectedParameter, selectedOperator, operatorOptions, selectedFrequency])

  return hasParameters ? (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' component='h2'>
        Historique des prélèvements
      </Typography>

      {selectedParameter && (
        <AggregatedSeriesExplorer
          showRangeSlider
          showPeriodSelector={false}
          showCalendar={false}
          series={aggregatedSeries}
          parameters={parameterOptions}
          selectedParameter={selectedParameter}
          defaultParameter={derivedDefaultParameter ?? undefined}
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
