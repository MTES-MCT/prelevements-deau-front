'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import AggregatedSeriesExplorer from './aggregated-series-explorer.js'

const DEFAULT_PARAMETERS = [
  {value: 'volume prélevé', label: 'Volume prélevé'},
  {value: 'débit instantané', label: 'Débit instantané'}
]

const DAY_IN_MS = 24 * 60 * 60 * 1000

const toIsoDate = date => date.toISOString().split('T')[0]

const createAggregatedSeries = ({
  parameter,
  unit,
  temporalOperator,
  pointName,
  base,
  amplitude,
  period,
  trend = 0,
  phase = 0
}) => {
  const days = 360
  const startDate = new Date('2024-01-01')

  const values = Array.from({length: days}, (_, dayIndex) => {
    const elapsed = dayIndex * DAY_IN_MS
    const current = new Date(startDate.getTime() + elapsed)
    const normalizedDay = (dayIndex + phase) / period
    const seasonal = Math.sin(normalizedDay) * amplitude
    const value = Math.max(0, base + seasonal + (trend * dayIndex))

    return {
      date: toIsoDate(current),
      value: Number(value.toFixed(2))
    }
  })

  const minDate = values[0].date
  const maxDate = values.at(-1).date

  return {
    metadata: {
      parameter,
      unit,
      temporalOperator,
      frequency: '1 day',
      startDate: minDate,
      endDate: maxDate,
      points: [{
        _id: `point-${parameter}`,
        idPoint: 212,
        nom: pointName
      }],
      usesDailyAggregates: true,
      minDate,
      maxDate,
      seriesCount: 1,
      valuesCount: values.length
    },
    values
  }
}

const SERIES_FIXTURES = {
  'volume prélevé': createAggregatedSeries({
    parameter: 'volume prélevé',
    unit: 'm³',
    temporalOperator: 'sum',
    pointName: 'Puits sucrerie du Gol',
    base: 85,
    amplitude: 25,
    period: 45,
    trend: 0.15
  }),
  'débit instantané': createAggregatedSeries({
    parameter: 'débit instantané',
    unit: 'm³/h',
    temporalOperator: 'avg',
    pointName: 'Forage Plaine des Cafres',
    base: 40,
    amplitude: 15,
    period: 30,
    trend: -0.05,
    phase: 8
  })
}

const meta = {
  title: 'Components/AggregatedSeriesExplorer',
  component: AggregatedSeriesExplorer,
  decorators: [
    Story => (
      <div style={{minHeight: 800, padding: '2rem'}}>
        <Story />
      </div>
    )
  ],
  tags: ['autodocs'],
  argTypes: {
    parameters: {
      control: 'object',
      description: 'Liste des paramètres disponibles. Chaque entrée peut être une chaîne ou un objet `{value, label}`.'
    },
    series: {
      control: false,
      description: `Série agrégée à afficher.

**Structure**:
\`\`\`json
{
  "metadata": {
    "parameter": "volume prélevé",
    "unit": "m³/h",
    "temporalOperator": "sum",
    "frequency": "1 day",
    "startDate": "2024-01-01",
    "endDate": "2024-12-25",
    "points": [{"_id": "id", "id_point": 212, "nom": "Point"}],
    "usesDailyAggregates": true,
    "minDate": "2024-01-01",
    "maxDate": "2024-12-25",
    "seriesCount": 1,
    "valuesCount": 360
  },
  "values": [{"date": "2024-01-01", "value": 120}]
}
\`\`\``
    }
  }
}

export default meta

const OPERATOR_LABELS = {
  sum: 'Somme',
  mean: 'Moyenne',
  min: 'Minimum',
  max: 'Maximum'
}

const PARAMETER_TEMPORAL_OPERATOR_CONFIG = {
  'volume prélevé': {defaultTemporalOperator: 'sum', temporalOperators: ['sum', 'mean', 'min', 'max']},
  'débit instantané': {defaultTemporalOperator: 'mean', temporalOperators: ['mean', 'min', 'max']}
}

const formatTemporalOperatorOptions = definition => {
  if (!definition) {
    return []
  }

  return (definition.temporalOperators ?? []).map(temporalOperator => ({
    value: temporalOperator,
    label: OPERATOR_LABELS[temporalOperator] ?? temporalOperator.toUpperCase()
  }))
}

const Template = args => {
  const parameterList = useMemo(
    () => args.parameters ?? DEFAULT_PARAMETERS,
    [args.parameters]
  )

  const firstParameter = parameterList[0]?.value ?? DEFAULT_PARAMETERS[0].value

  const [selectedParameter, setSelectedParameter] = useState(firstParameter)
  const [selectedTemporalOperator, setSelectedTemporalOperator] = useState(
    PARAMETER_TEMPORAL_OPERATOR_CONFIG[firstParameter]?.defaultTemporalOperator ?? 'sum'
  )
  const [series, setSeries] = useState(() => SERIES_FIXTURES[firstParameter])
  const [isLoading, setIsLoading] = useState(false)
  const pendingTimeout = useRef(null)

  const temporalOperatorDefinition = useMemo(
    () => PARAMETER_TEMPORAL_OPERATOR_CONFIG[selectedParameter] ?? PARAMETER_TEMPORAL_OPERATOR_CONFIG[firstParameter],
    [selectedParameter, firstParameter]
  )

  const temporalOperatorOptions = useMemo(
    () => formatTemporalOperatorOptions(temporalOperatorDefinition),
    [temporalOperatorDefinition]
  )

  const defaultTemporalOperator = temporalOperatorDefinition?.defaultTemporalOperator
    ?? temporalOperatorOptions[0]?.value
    ?? null

  useEffect(() => {
    const availableValues = parameterList.map(option => option.value)
    if (!availableValues.includes(selectedParameter)) {
      const fallback = availableValues[0] ?? DEFAULT_PARAMETERS[0].value
      setSelectedParameter(fallback)
    }
  }, [parameterList, selectedParameter])

  useEffect(() => {
    setSelectedTemporalOperator(prev => {
      if (prev && temporalOperatorOptions.some(option => option.value === prev)) {
        return prev
      }

      return defaultTemporalOperator
    })
  }, [temporalOperatorOptions, defaultTemporalOperator])

  useEffect(() => () => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current)
    }

    setIsLoading(true)

    pendingTimeout.current = setTimeout(() => {
      const baseSeries = SERIES_FIXTURES[selectedParameter]
        ?? SERIES_FIXTURES[firstParameter]
        ?? SERIES_FIXTURES[DEFAULT_PARAMETERS[0].value]

      if (baseSeries) {
        setSeries({
          ...baseSeries,
          metadata: {
            ...baseSeries.metadata,
            temporalOperator: selectedTemporalOperator ?? baseSeries.metadata.temporalOperator
          }
        })
      }

      setIsLoading(false)
    }, 400)
  }, [selectedParameter, selectedTemporalOperator, firstParameter])

  const handleParameterChange = useCallback(newParameter => {
    setSelectedParameter(newParameter)
  }, [])

  const handleTemporalOperatorChange = useCallback(newTemporalOperator => {
    setSelectedTemporalOperator(newTemporalOperator)
  }, [])

  return (
    <AggregatedSeriesExplorer
      {...args}
      series={series}
      parameters={parameterList}
      selectedParameter={selectedParameter}
      temporalOperatorOptions={temporalOperatorOptions}
      selectedTemporalOperator={selectedTemporalOperator}
      defaultTemporalOperator={defaultTemporalOperator}
      isLoading={isLoading}
      onParameterChange={handleParameterChange}
      onTemporalOperatorChange={handleTemporalOperatorChange}
    />
  )
}

export const ApercuDeBase = {
  render: Template,
  args: {
    parameters: DEFAULT_PARAMETERS,
    showCalendar: true,
    showChart: true,
    showRangeSlider: true
  }
}
