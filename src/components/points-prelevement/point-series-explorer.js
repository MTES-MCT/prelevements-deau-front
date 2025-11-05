'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import {getAggregatedSeries} from '@/app/api/aggregated-series.js'
import AggregatedSeriesExplorer from '@/components/PrelevementsSeriesExplorer/aggregated-series-explorer.js'
import {
  getAvailableParametersFromSeries,
  getParameterMetadata
} from '@/components/PrelevementsSeriesExplorer/constants/parameters.js'

const DEFAULT_FREQUENCY = '1 day'

const OPERATOR_LABELS = {
  sum: 'Somme',
  mean: 'Moyenne',
  min: 'Minimum',
  max: 'Maximum'
}

const PointSeriesExplorer = ({pointId, series = []}) => {
  console.log('series in PointSeriesExplorer:', series)

  // If no series are provided or the array is empty, show only an info alert
  // as requested: do not render the rest of the UI. We must NOT return early
  // before calling hooks to preserve hook order.
  const isSeriesEmpty = !series || (Array.isArray(series) && series.length === 0)
  const availableParameters = useMemo(
    () => getAvailableParametersFromSeries(series),
    [series]
  )

  const parameterOptions = useMemo(
    () => availableParameters.map(entry => ({
      value: entry.parameter,
      label: entry.parameter
    })),
    [availableParameters]
  )

  const parameterDefinitionMap = useMemo(
    () => new Map(availableParameters.map(entry => [entry.parameter, entry])),
    [availableParameters]
  )

  const derivedDefaultParameter = parameterOptions[0]?.value ?? null

  const [selectedParameter, setSelectedParameter] = useState(derivedDefaultParameter)
  const [selectedOperator, setSelectedOperator] = useState(null)
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
  const hasParameters = parameterOptions.length > 0

  const fetchAggregatedSeries = useCallback(async (parameter, operator) => {
    const params = {
      pointIds: [pointId],
      parameter,
      operator,
      aggregationFrequency: DEFAULT_FREQUENCY
    }

    return getAggregatedSeries(params)
  }, [pointId])

  useEffect(() => {
    if (!selectedParameter || !resolvedOperator) {
      setAggregatedSeries(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    const loadSeries = async () => {
      try {
        const response = await fetchAggregatedSeries(selectedParameter, resolvedOperator)
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
  }, [selectedParameter, resolvedOperator, fetchAggregatedSeries])

  const handleParameterChange = useCallback(newParameter => {
    if (!newParameter || newParameter === selectedParameter) {
      return
    }

    const nextDefinition = parameterDefinitionMap.get(newParameter)
      ?? getParameterMetadata(newParameter)
    const nextDefaultOperator = nextDefinition?.defaultOperator
      ?? nextDefinition?.operators?.[0]
      ?? null

    setSelectedParameter(newParameter)

    if (!nextDefinition) {
      setSelectedOperator(null)
      return
    }

    const availableOperators = nextDefinition.operators ?? []
    const isCurrentOperatorValid = selectedOperator && availableOperators.includes(selectedOperator)

    if (isCurrentOperatorValid) {
      return
    }

    setSelectedOperator(nextDefaultOperator)
  }, [parameterDefinitionMap, selectedParameter, selectedOperator])

  const handleOperatorChange = useCallback(newOperator => {
    if (!newOperator || newOperator === selectedOperator) {
      return
    }

    if (!operatorOptions.includes(newOperator)) {
      return
    }

    setSelectedOperator(newOperator)
  }, [selectedOperator, operatorOptions])

  return isSeriesEmpty ? (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' component='h2'>
        Historique des prélèvements
      </Typography>

      <Alert
        severity='info'
        description='Aucun prélèvement connu pour ce point.'
      />
    </Box>
  ) : (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' component='h2'>
        Historique des prélèvements
      </Typography>

      {!hasParameters && (
        <Alert
          severity='info'
          description='Aucun paramètre compatible n’est disponible pour ce point.'
        />
      )}

      {hasParameters && selectedParameter && (
        <AggregatedSeriesExplorer
          showRangeSlider
          series={aggregatedSeries}
          parameters={parameterOptions}
          selectedParameter={selectedParameter}
          defaultParameter={derivedDefaultParameter ?? undefined}
          operatorOptions={operatorSelectOptions}
          selectedOperator={resolvedOperator ?? undefined}
          defaultOperator={resolvedDefaultOperator ?? undefined}
          error={loadError}
          isLoading={isLoading}
          onParameterChange={handleParameterChange}
          onOperatorChange={handleOperatorChange}
        />
      )}
    </Box>
  )
}

export default PointSeriesExplorer
