import {normalizeString} from '@/utils/string.js'

const VOLUME_TEMPORAL_OPERATORS = Object.freeze(['sum', 'mean', 'min', 'max'])
const STANDARD_TEMPORAL_OPERATORS = Object.freeze(['mean', 'min', 'max'])

export const MAX_DIFFERENT_UNITS = 2

export const OPERATOR_LABELS = {
  sum: 'Somme',
  mean: 'Moyenne',
  min: 'Minimum',
  max: 'Maximum'
}

/**
 * Default translations for UI strings
 */
export const DEFAULT_TRANSLATIONS = {
  periodLabel: 'Période d\'observation',
  parameterLabel: 'Paramètres à afficher',
  parameterHint: 'Vous pouvez sélectionner jusqu’à deux unités différentes. Les options incompatibles sont grisées.',
  parameterPlaceholder: 'Choisir des paramètres...',
  operatorLabel: 'Opérateur d’agrégation',
  operatorPlaceholder: 'Sélectionner un opérateur',
  frequencyLabel: 'Pas de temps',
  frequencyHint: 'Choisissez la fréquence d\'agrégation des données.',
  frequencyPlaceholder: 'Sélectionner un pas de temps',
  noDataMessage: 'Aucune donnée disponible pour la période sélectionnée',
  rangeLabel: 'Affiner la plage temporelle',
  loadingData: 'Chargement des données...',
  loadError: 'Erreur de chargement',
  selectParametersMessage: 'Sélectionnez des paramètres pour afficher le graphique'
}

export const AGGREGATED_PARAMETERS = [
  {
    parameter: 'volume prélevé',
    unit: 'm³',
    type: 'cumulative',
    defaultTemporalOperator: 'sum',
    temporalOperators: VOLUME_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'volume restitué',
    unit: 'm³',
    type: 'cumulative',
    defaultTemporalOperator: 'sum',
    temporalOperators: VOLUME_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'débit prélevé',
    unit: 'L/s',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0 // L/s: integer; use 1 for m³/h
  },
  {
    parameter: 'débit réservé',
    unit: 'L/s',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0 // L/s: integer; use 1 for m³/h
  },
  {
    parameter: 'débit restitué',
    unit: 'L/s',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0 // L/s: integer; use 1 for m³/h
  },
  {
    parameter: 'température',
    unit: '°C',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 1
  },
  {
    parameter: 'niveau piézométrique',
    unit: 'm NGR',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 2
  },
  {
    parameter: 'chlorures',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'nitrates',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'sulfates',
    unit: 'mg/L',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'turbidité',
    unit: 'FTU',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'conductivité',
    unit: 'µS/cm',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 0
  },
  {
    parameter: 'pH',
    unit: '',
    type: 'instantaneous',
    defaultTemporalOperator: 'mean',
    temporalOperators: STANDARD_TEMPORAL_OPERATORS,
    precision: 2
  }
].map(entry => ({
  ...entry,
  temporalOperators: [...entry.temporalOperators]
}))

export const FREQUENCY_OPTIONS = [
  {value: '15 minutes', label: '15 minutes'},
  {value: '1 hour', label: '1 heure'},
  {value: '6 hours', label: '6 heures'},
  {value: '1 day', label: '1 jour'},
  {value: '1 month', label: '1 mois'},
  {value: '1 quarter', label: '1 trimestre'},
  {value: '1 year', label: '1 an'}
]

export const DEFAULT_AGGREGATION_FREQUENCY = '1 day'

export function getParameterMetadata(parameterName) {
  if (!parameterName) {
    return undefined
  }

  const normalized = normalizeString(parameterName)
  return AGGREGATED_PARAMETERS.find(
    entry => normalizeString(entry.parameter) === normalized
  )
}

export function getAvailableParametersFromSeries(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return AGGREGATED_PARAMETERS
  }

  const availableKeys = new Set(
    series
      .map(item => normalizeString(item?.parameter ?? item?.parametre))
      .filter(Boolean)
  )

  if (availableKeys.size === 0) {
    return AGGREGATED_PARAMETERS
  }

  return AGGREGATED_PARAMETERS.filter(entry =>
    availableKeys.has(normalizeString(entry.parameter))
  )
}
