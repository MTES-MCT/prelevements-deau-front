/**
 * Constants used across PrelevementsSeriesExplorer components
 */

import {normalizeString} from '@/utils/string.js'

/**
 * Color configuration ensuring a deterministic color per known parameter
 */
const PARAMETER_COLOR_ENTRIES = [
  ['volume preleve', '#000091'],
  ['debit preleve', '#0063CB'],
  ['debit reserve', '#CE70CC'],
  ['debit restitue', '#009099'],
  ['volume restitue', '#465F9D'],
  ['temperature', '#B34000'],
  ['turbidite', '#CCB078'],
  ['niveau deau', '#D8C634'],
  ['conductivite', '#CE614A'],
  ['ph', '#FFCA00'],
  ['nitrates', '#21AB82'],
  ['sulfates', '#99C221'],
  ['chlorures', '#34B1B5'],
  ['releve dindex de compteur', '#3B87FF'],
  ['autre', '#AEA397']
]

export const PARAMETER_COLOR_MAP = new Map(
  PARAMETER_COLOR_ENTRIES.map(([name, color]) => [normalizeString(name), color])
)

export const FALLBACK_PARAMETER_COLOR = PARAMETER_COLOR_MAP.get('autre')

/**
 * Calendar status colors based on DSFR design system
 * Re-exported from centralized calendar colors module
 * @see @/lib/calendar-colors.js
 */
export {CALENDAR_STATUS_COLORS} from '@/lib/calendar-colors.js'

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
