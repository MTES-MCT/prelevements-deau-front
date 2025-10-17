/**
 * Constants used across PrelevementsSeriesExplorer components
 */

/**
 * Normalizes parameter names for consistent color mapping lookups
 * - Trims surrounding whitespace
 * - Converts to lowercase
 * - Removes diacritic marks and apostrophes
 * - Collapses repeated spaces
 *
 * @param {string} value - Raw parameter label
 * @returns {string} Normalized parameter key
 */
export const normalizeParameterKey = value => {
  if (!value) {
    return ''
  }

  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/['\u2019]/g, '') // Remove both straight (') and curly (') apostrophes
    .replaceAll(/\s+/g, ' ')
}

/**
 * Color configuration ensuring a deterministic color per known parameter
 */
const PARAMETER_COLOR_ENTRIES = [
  ['volume preleve', '#000091'],
  ['debit preleve', '#0063CB'],
  ['debit reserve', '#3A3A3A'],
  ['debit restitue', '#009099'],
  ['volume restitue', '#465F9D'],
  ['temperature', '#B34000'],
  ['turbidite', '#CE0500'],
  ['niveau deau', '#009099'],
  ['conductivite', '#6E445A'],
  ['ph', '#A55800'],
  ['nitrates', '#18753C'],
  ['sulfates', '#007D8A'],
  ['chlorures', '#465F9D'],
  ['releve dindex de compteur', '#3A3A3A'],
  ['autre', '#666666']
]

export const PARAMETER_COLOR_MAP = new Map(
  PARAMETER_COLOR_ENTRIES.map(([name, color]) => [normalizeParameterKey(name), color])
)

export const FALLBACK_PARAMETER_COLOR = PARAMETER_COLOR_MAP.get('autre')

/**
 * Calendar status colors based on DSFR design system
 * Used to indicate data availability on calendar views
 * Colors are hardcoded to avoid import issues in tests
 *
 * Status definitions:
 * - present: Data has values (dark blue)
 * - noSampling: Value is 0 (light blue - no sampling occurred)
 * - notDeclared: Date not in series range (grey - data not declared)
 */
export const CALENDAR_STATUS_COLORS = {
  noSampling: '#8fb6fb', // Info.hover (light blue) - value is 0
  notDeclared: '#cecece', // Grey.active (grey) - not in series
  present: '#000091' // BlueFrance.default (dark blue) - has data
}

/**
 * Month labels used for formatting
 */
export const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
]

/**
 * Default translations for UI strings
 */
export const DEFAULT_TRANSLATIONS = {
  periodLabel: 'Période d\'observation',
  parameterLabel: 'Paramètres à afficher',
  parameterHint: 'Sélectionnez jusqu\'à 2 unités différentes',
  parameterPlaceholder: 'Choisir des paramètres...',
  noDataMessage: 'Aucune donnée disponible pour la période sélectionnée',
  validationError: 'Erreur de validation',
  rangeLabel: 'Affiner la plage temporelle',
  loadingData: 'Chargement des données...',
  loadError: 'Erreur de chargement',
  selectParametersMessage: 'Sélectionnez des paramètres pour afficher le graphique'
}
