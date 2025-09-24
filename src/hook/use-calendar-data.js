/**
 * @fileoverview Hook personnalisé pour la gestion des calendriers
 * Centralise la logique de traitement des données et de génération des calendriers
 */

import {useMemo} from 'react'

import {
  generateMultiYearCalendars,
  generateYearlyCalendars,
  generateMonthlyCalendars
} from '@/utils/calendar-generators.js'
import {processCalendarData, determineCalendarMode} from '@/utils/calendar.js'

/**
 * Hook personnalisé pour gérer les calendriers
 * Traite les données et génère les calendriers appropriés selon la plage de dates
 *
 * @param {Object[]} data - Données du calendrier au format [{date: 'dd-MM-yyyy', colorA: 'string'}]
 * @returns {Object} Objet contenant les calendriers générés et les métadonnées
 * @returns {Object[]} returns.calendars - Liste des calendriers à afficher
 * @returns {string} returns.mode - Mode d'affichage déterminé ('month', 'year', 'multi-year')
 * @returns {boolean} returns.hasData - Indique si des données sont présentes
 * @returns {Date|null} returns.minDate - Date minimale des données
 * @returns {Date|null} returns.maxDate - Date maximale des données
 * @returns {boolean} returns.hasErrors - Indique si des erreurs ont été rencontrées
 */
export const useCalendarData = data => useMemo(() => {
  // Traitement initial des données
  const processedData = processCalendarData(data)
  const {
    entriesByDay,
    entriesByMonth,
    entriesByYear,
    minDate,
    maxDate,
    hasErrors
  } = processedData

  // Si des erreurs sont détectées, retour d'un état d'erreur
  if (hasErrors) {
    return {
      calendars: [],
      mode: 'month',
      hasData: false,
      minDate: null,
      maxDate: null,
      hasErrors: true
    }
  }

  // Si aucune donnée valide, retour d'un état vide
  if (!minDate || !maxDate) {
    return {
      calendars: [],
      mode: 'month',
      hasData: false,
      minDate: null,
      maxDate: null,
      hasErrors: false
    }
  }

  // Détermination du mode d'affichage optimal
  const mode = determineCalendarMode(minDate, maxDate)

  // Génération des calendriers selon le mode
  let calendars = []
  switch (mode) {
    case 'multi-year': {
      calendars = generateMultiYearCalendars(entriesByYear, minDate, maxDate)
      break
    }

    case 'year': {
      calendars = generateYearlyCalendars(entriesByMonth, minDate, maxDate)
      break
    }

    default: {
      calendars = generateMonthlyCalendars(entriesByDay, minDate, maxDate)
      break
    }
  }

  return {
    calendars,
    mode,
    hasData: true,
    minDate,
    maxDate,
    hasErrors: false
  }
}, [data])
