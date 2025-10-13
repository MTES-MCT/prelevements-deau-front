/**
 * Constants used across PrelevementsSeriesExplorer components
 */

/**
 * Default color palette for series
 * Distinct colors for better visual differentiation
 */
export const DEFAULT_COLOR_PALETTE = [
  '#0078f3', // Blue
  '#e63946', // Red
  '#06a77d', // Green
  '#f77f00', // Orange
  '#9d4edd', // Purple
  '#e63995', // Pink
  '#06d6a0', // Teal
  '#f4a261', // Light orange
  '#457b9d', // Steel blue
  '#e76f51' // Terra cotta
]

/**
 * Calendar status colors based on DSFR design system
 * Used to indicate data availability on calendar views
 * Colors are hardcoded to avoid import issues in tests
 */
export const CALENDAR_STATUS_COLORS = {
  noSampling: '#8fb6fb', // Info.hover (light blue)
  notDeclared: '#cecece', // Grey.active
  present: '#000091' // BlueFrance.default
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
