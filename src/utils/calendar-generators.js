/**
 * @fileoverview Générateurs de cellules pour les différents modes d'affichage du calendrier
 * Contient les fonctions spécialisées pour créer les cellules selon le mode (mois, année, multi-années)
 */

import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getISODay,
  format
} from 'date-fns'
import {fr as frLocale} from 'date-fns/locale'

import {resolveAggregatedColor} from '@/utils/calendar.js'
import {capitalize} from '@/utils/string.js'

/**
 * Cellule de calendrier
 * @typedef {Object} CalendarCell
 * @property {string} key - Identifiant unique de la cellule
 * @property {string} label - Texte affiché dans la cellule
 * @property {string|null} color - Couleur de fond de la cellule
 * @property {string} mode - Mode d'affichage ('month', 'year', 'multi-year')
 * @property {Object[]} entries - Données associées à cette cellule
 * @property {Date} periodStart - Date de début de la période
 * @property {Date} periodEnd - Date de fin de la période
 * @property {boolean} isInteractive - Indique si la cellule est cliquable
 * @property {string} ariaLabel - Label d'accessibilité
 * @property {boolean} [isPlaceholder] - Indique si c'est une cellule vide
 */

/**
 * Description d'un calendrier à afficher
 * @typedef {Object} CalendarDescription
 * @property {string} key - Identifiant unique du calendrier
 * @property {string} title - Titre du calendrier
 * @property {boolean} compactMode - Mode compact d'affichage
 * @property {CalendarCell[]} cells - Cellules du calendrier
 */

/**
 * Génère les cellules pour l'affichage multi-années
 * @param {Map<string, Object[]>} entriesByYear - Entrées groupées par année
 * @param {Date} minDate - Date minimale
 * @param {Date} maxDate - Date maximale
 * @returns {CalendarDescription[]} Descriptions des calendriers multi-années
 */
export const generateMultiYearCalendars = (entriesByYear, minDate, maxDate) => {
  const startYear = minDate.getFullYear()
  const endYear = maxDate.getFullYear()
  const cells = []

  for (let currentYear = startYear; currentYear <= endYear; currentYear += 1) {
    const yearKey = String(currentYear)
    const entries = entriesByYear.get(yearKey) ?? []
    const color = resolveAggregatedColor(entries)

    cells.push({
      key: `year-${currentYear}`,
      label: `${currentYear}`,
      color,
      mode: 'multi-year',
      entries,
      periodStart: startOfYear(new Date(currentYear, 0, 1)),
      periodEnd: endOfYear(new Date(currentYear, 0, 1)),
      isInteractive: false,
      ariaLabel: `Année ${currentYear}`
    })
  }

  return [{
    key: 'multi-year',
    title: `${startYear} - ${endYear}`,
    compactMode: true,
    cells
  }]
}

/**
 * Génère les cellules pour l'affichage par années
 * @param {Map<string, Object[]>} entriesByMonth - Entrées groupées par mois
 * @param {Date} minDate - Date minimale
 * @param {Date} maxDate - Date maximale
 * @returns {CalendarDescription[]} Descriptions des calendriers annuels
 */
export const generateYearlyCalendars = (entriesByMonth, minDate, maxDate) => {
  const calendars = []

  for (let currentYear = minDate.getFullYear(); currentYear <= maxDate.getFullYear(); currentYear += 1) {
    const cells = Array.from({length: 12}).map((_, monthIndex) => {
      const monthDate = new Date(currentYear, monthIndex, 1)
      const monthKey = format(monthDate, 'yyyy-MM')
      const entries = entriesByMonth.get(monthKey) ?? []
      const color = resolveAggregatedColor(entries)

      return {
        key: `month-${currentYear}-${monthIndex}`,
        label: capitalize(format(monthDate, 'MMM', {locale: frLocale})),
        color,
        mode: 'year',
        entries,
        periodStart: startOfMonth(monthDate),
        periodEnd: endOfMonth(monthDate),
        isInteractive: false,
        ariaLabel: `Mois ${format(monthDate, 'MMMM yyyy', {locale: frLocale})}`
      }
    })

    calendars.push({
      key: `year-${currentYear}`,
      title: `${currentYear}`,
      compactMode: true,
      cells
    })
  }

  return calendars
}

/**
 * Génère les cellules de placeholder pour un mois
 * @param {Date} monthStart - Premier jour du mois
 * @param {number} count - Nombre de placeholders
 * @param {string} prefix - Préfixe pour les clés
 * @returns {CalendarCell[]} Cellules de placeholder
 */
const generatePlaceholders = (monthStart, count, prefix) =>
  Array.from({length: count}).map((_, index) => ({
    key: `${prefix}-${monthStart.getFullYear()}-${monthStart.getMonth()}-${index}`,
    mode: 'month',
    isPlaceholder: true
  }))

/**
 * Génère les cellules pour l'affichage mensuel
 * @param {Map<string, Object[]>} entriesByDay - Entrées groupées par jour
 * @param {Date} minDate - Date minimale
 * @param {Date} maxDate - Date maximale
 * @returns {CalendarDescription[]} Descriptions des calendriers mensuels
 */
export const generateMonthlyCalendars = (entriesByDay, minDate, maxDate) => {
  const calendars = []
  let cursor = startOfMonth(minDate)
  const limit = startOfMonth(maxDate)

  while (cursor <= limit) {
    const monthStart = cursor
    const monthEnd = endOfMonth(monthStart)
    const monthDays = eachDayOfInterval({start: monthStart, end: monthEnd})

    // Calcul de l'offset pour aligner avec lundi = jour 1
    const startOffset = getISODay(monthStart) - 1

    // Cellules de placeholder au début
    const leadingPlaceholders = generatePlaceholders(monthStart, startOffset, 'placeholder-start')

    // Cellules des jours du mois
    const dayCells = monthDays.map(date => {
      const dayKey = format(date, 'yyyy-MM-dd')
      const entries = entriesByDay.get(dayKey) ?? []
      const color = resolveAggregatedColor(entries)
      const formattedLabel = String(date.getDate())

      return {
        key: dayKey,
        label: formattedLabel,
        color,
        mode: 'month',
        entries,
        date,
        dayStyleEntry: entries[0] ?? null,
        periodStart: date,
        periodEnd: date,
        isInteractive: entries.length > 0,
        ariaLabel: format(date, 'PPP', {locale: frLocale})
      }
    })

    // Cellules de placeholder à la fin pour compléter la grille
    const totalCells = startOffset + dayCells.length
    const trailingPlaceholdersCount = (7 - (totalCells % 7)) % 7
    const trailingPlaceholders = generatePlaceholders(monthStart, trailingPlaceholdersCount, 'placeholder-end')

    const cells = [...leadingPlaceholders, ...dayCells, ...trailingPlaceholders]

    calendars.push({
      key: `month-${cursor.getFullYear()}-${cursor.getMonth()}`,
      title: capitalize(format(monthStart, 'MMMM yyyy', {locale: frLocale})),
      compactMode: false,
      cells
    })

    cursor = addMonths(cursor, 1)
  }

  return calendars
}
