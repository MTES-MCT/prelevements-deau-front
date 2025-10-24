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

import {fr} from '@codegouvfr/react-dsfr'

/**
 * Get calendar status colors from DSFR theme
 * @param {boolean} [isDark=false] - Whether to use dark theme colors
 * @returns {Object} Calendar status colors
 */
export function getCalendarStatusColors(isDark = false) {
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
export const CALENDAR_STATUS_COLORS = getCalendarStatusColors(false)

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
