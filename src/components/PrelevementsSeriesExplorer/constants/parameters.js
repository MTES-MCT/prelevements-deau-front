import {normalizeParameterKey} from './colors.js'

const VOLUME_OPERATORS = Object.freeze(['sum', 'mean', 'min', 'max'])
const STANDARD_OPERATORS = Object.freeze(['mean', 'min', 'max'])

export const OPERATOR_LABELS = {
  sum: 'Somme',
  mean: 'Moyenne',
  min: 'Minimum',
  max: 'Maximum'
}

export const AGGREGATED_PARAMETERS = [
  {
    parameter: 'volume prélevé',
    unit: 'm³',
    type: 'cumulative',
    defaultOperator: 'sum',
    operators: VOLUME_OPERATORS
  },
  {
    parameter: 'volume restitué',
    unit: 'm³',
    type: 'cumulative',
    defaultOperator: 'sum',
    operators: VOLUME_OPERATORS
  },
  {
    parameter: 'débit prélevé',
    unit: 'L/s',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'débit réservé',
    unit: 'L/s',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'débit restitué',
    unit: 'L/s',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'température',
    unit: '°C',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'niveau piézométrique',
    unit: 'm NGR',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'chlorures',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'nitrates',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'sulfates',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'turbidité',
    unit: 'FTU',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'conductivité électrique',
    unit: 'µS/cm',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  },
  {
    parameter: 'pH',
    unit: '',
    type: 'instantaneous',
    defaultOperator: 'mean',
    operators: STANDARD_OPERATORS
  }
].map(entry => ({
  ...entry,
  operators: [...entry.operators]
}))

export const FREQUENCY_OPTIONS = [
  {value: '15 minutes', label: '15 minutes'},
  {value: '1 hour', label: '1 heure'},
  {value: '6 hours', label: '6 heures'},
  {value: '1 day', label: '1 jour'},
  {value: '1 month', label: '1 mois'},
  {value: '1 year', label: '1 an'}
]

export const DEFAULT_AGGREGATION_FREQUENCY = '1 day'

export function getParameterMetadata(parameterName) {
  if (!parameterName) {
    return undefined
  }

  const normalized = normalizeParameterKey(parameterName)
  return AGGREGATED_PARAMETERS.find(
    entry => normalizeParameterKey(entry.parameter) === normalized
  )
}

export function getAvailableParametersFromSeries(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return AGGREGATED_PARAMETERS
  }

  const availableKeys = new Set(
    series
      .map(item => normalizeParameterKey(item?.parameter ?? item?.parametre))
      .filter(Boolean)
  )

  if (availableKeys.size === 0) {
    return AGGREGATED_PARAMETERS
  }

  return AGGREGATED_PARAMETERS.filter(entry =>
    availableKeys.has(normalizeParameterKey(entry.parameter))
  )
}

export function getAutomaticFrequency(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return DEFAULT_AGGREGATION_FREQUENCY
  }

  let totalDays = 0

  for (const period of periods) {
    switch (period?.type) {
      case 'year': {
        totalDays += 365
        break
      }

      case 'month': {
        totalDays += 30
        break
      }

      case 'day': {
        totalDays += 1
        break
      }

      default: {
        break
      }
    }
  }

  if (totalDays <= 2) {
    return '1 hour'
  }

  if (totalDays <= 60) {
    return '1 day'
  }

  if (totalDays <= 365) {
    return '1 week'
  }

  return '1 month'
}
