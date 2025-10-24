/**
 * Calendar status colors based on DSFR design system
 * These colors are used throughout the application for calendar displays
 * and must be kept in sync with the DSFR color palette.
 *
 * Status definitions:
 * - present: Data has values (dark blue)
 * - noSampling: Value is 0 (light blue - no sampling occurred)
 * - notDeclared: Date not in series range (grey - data not declared)
 */

/**
 * Static color values for testing and SSR compatibility
 * These values match the DSFR light theme
 */
export const STATIC_CALENDAR_STATUS_COLORS = {
  present: '#000091', // BlueFrance.default (dark blue) - has data
  noSampling: '#e8edff', // Info.hover (light blue) - value is 0
  notDeclared: '#e5e5e5' // Grey.active (grey) - not in series
}

/**
 * Get calendar status colors from DSFR theme (client-side only)
 * @param {boolean} [isDark=false] - Whether to use dark theme colors
 * @returns {Object} Calendar status colors
 */
export async function getCalendarStatusColors(isDark = false) {
  // Use static values if running in Node.js (tests/SSR)
  if (typeof window === 'undefined') {
    return STATIC_CALENDAR_STATUS_COLORS
  }

  // Dynamic import for client-side only
  const {fr} = await import('@codegouvfr/react-dsfr')
  const colors = fr.colors.getHex({isDark})

  return {
    present: colors.decisions.artwork.major.blueFrance.default,
    noSampling: colors.decisions.background.actionHigh.info.hover,
    notDeclared: colors.decisions.background.actionHigh.grey.active
  }
}

/**
 * Default calendar status colors (light theme)
 * Used for consistency across components that don't need theme switching
 */
export const CALENDAR_STATUS_COLORS = STATIC_CALENDAR_STATUS_COLORS

/**
 * Default legend labels for calendar status colors
 * @param {Object} [colors=CALENDAR_STATUS_COLORS] - Custom colors to use
 * @returns {Array<{color: string, label: string}>} Legend labels
 */
export function getCalendarLegendLabels(colors = CALENDAR_STATUS_COLORS) {
  return [
    {color: colors.present, label: 'Données présentes'},
    {color: colors.noSampling, label: 'Pas de prélèvement'},
    {color: colors.notDeclared, label: 'Non déclaré / pas de déclaration'}
  ]
}
