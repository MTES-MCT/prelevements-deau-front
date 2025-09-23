/**
 * @fileoverview Utilitaires pour la gestion des calendriers
 * Contient les fonctions de traitement des données et de calcul des modes d'affichage
 */

import {
  parse,
  isValid,
  differenceInCalendarMonths,
  format
} from 'date-fns'

/**
 * Types de modes d'affichage du calendrier
 * @typedef {'month' | 'year' | 'multi-year'} CalendarMode
 */

/**
 * Structure d'une entrée de données du calendrier
 * @typedef {Object} CalendarEntry
 * @property {string} date - Date au format dd-MM-yyyy
 * @property {string} [color] - Couleur pour l'affichage
 * @property {Date} [dateObj] - Objet Date parsé (ajouté pendant le traitement)
 */

/**
 * Résultat du traitement des données du calendrier
 * @typedef {Object} ProcessedCalendarData
 * @property {Map<string, CalendarEntry[]>} entriesByDay - Entrées groupées par jour (yyyy-MM-dd)
 * @property {Map<string, CalendarEntry[]>} entriesByMonth - Entrées groupées par mois (yyyy-MM)
 * @property {Map<string, CalendarEntry[]>} entriesByYear - Entrées groupées par année (yyyy)
 * @property {Date|null} minDate - Date minimale trouvée
 * @property {Date|null} maxDate - Date maximale trouvée
 */

/**
 * Ajoute une valeur à une collection dans une Map
 * @private
 * @param {Map} map - La Map à modifier
 * @param {string} key - La clé de la collection
 * @param {*} value - La valeur à ajouter
 */
const addToCollectionMap = (map, key, value) => {
  if (!map.has(key)) {
    map.set(key, [])
  }

  map.get(key).push(value)
}

/**
 * Résout la couleur agrégée d'un ensemble d'entrées
 * Privilégie les entrées avec une couleur
 * @param {CalendarEntry[]} entries - Les entrées à traiter
 * @returns {string|null} La couleur résolue ou null
 */
export const resolveAggregatedColor = entries => {
  if (!entries || entries.length === 0) {
    return null
  }

  const entryWithColor = entries.find(entry => entry.color)
  if (entryWithColor) {
    return entryWithColor.color
  }

  return null
}

/**
 * Détermine le mode d'affichage optimal selon la plage de dates
 * @param {Date} minDate - Date minimale
 * @param {Date} maxDate - Date maximale
 * @returns {CalendarMode} Le mode d'affichage optimal
 */
export const determineCalendarMode = (minDate, maxDate) => {
  if (!minDate || !maxDate) {
    return 'month'
  }

  const totalMonths = differenceInCalendarMonths(maxDate, minDate) + 1

  if (totalMonths > 72) {
    return 'multi-year'
  }

  if (totalMonths > 6) {
    return 'year'
  }

  return 'month'
}

/**
 * Traite et groupe les données du calendrier par différentes unités de temps
 * @param {CalendarEntry[]} data - Les données brutes à traiter
 * @returns {ProcessedCalendarData} Les données traitées et groupées
 */
export const processCalendarData = data => {
  const entriesByDay = new Map()
  const entriesByMonth = new Map()
  const entriesByYear = new Map()

  let minDate = null
  let maxDate = null

  // Traitement et validation des données
  for (const item of data ?? []) {
    try {
      const parsedDate = parse(item.date, 'dd-MM-yyyy', new Date())

      if (!isValid(parsedDate)) {
        console.warn(`Format de date invalide : ${item.date}. Format attendu : dd-MM-yyyy.`)
        continue
      }

      const enhancedEntry = {...item, dateObj: parsedDate}

      // Génération des clés pour chaque niveau de granularité
      const dayKey = format(parsedDate, 'yyyy-MM-dd')
      const monthKey = format(parsedDate, 'yyyy-MM')
      const yearKey = format(parsedDate, 'yyyy')

      // Ajout aux collections correspondantes
      addToCollectionMap(entriesByDay, dayKey, enhancedEntry)
      addToCollectionMap(entriesByMonth, monthKey, enhancedEntry)
      addToCollectionMap(entriesByYear, yearKey, enhancedEntry)

      // Mise à jour des bornes de dates
      if (!minDate || parsedDate < minDate) {
        minDate = parsedDate
      }

      if (!maxDate || parsedDate > maxDate) {
        maxDate = parsedDate
      }
    } catch {
      console.warn(`Erreur lors du traitement de la date : ${item.date}. Format attendu : dd-MM-yyyy.`)
    }
  }

  return {
    entriesByDay,
    entriesByMonth,
    entriesByYear,
    minDate,
    maxDate
  }
}
