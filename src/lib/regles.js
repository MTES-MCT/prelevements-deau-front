import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HeightOutlinedIcon from '@mui/icons-material/HeightOutlined'
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined'
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'

import {safeParseDate} from '@/lib/format-date.js'

const regleParametres = {
  'Volume annuel': {label: 'Volume prélevé annuel', icon: <OpacityOutlinedIcon />},
  'Volume mensuel': {label: 'Volume prélevé mensuel', icon: <OpacityOutlinedIcon />},
  'Volume journalier': {label: 'Volume prélevé journalier', icon: <OpacityOutlinedIcon />},
  'Débit prélevé': {label: 'Débit prélevé', icon: <OilBarrelOutlinedIcon />},
  'Débit réservé': {label: 'Débit réservé', icon: <WaterOutlinedIcon />},
  'Niveau piézométrique': {label: 'Niveau piézométrique', icon: <HeightOutlinedIcon />},
  'Conductivité électrique': {label: 'Conductivité électrique', icon: <OfflineBoltOutlinedIcon />},
  Température: {label: 'Conductivité électrique', icon: <DeviceThermostatOutlinedIcon />},
  Chlorures: {label: 'Concentration en chlorures', icon: <ScienceOutlinedIcon />},
  Nitrates: {label: 'Concentration en nitrates', icon: <ScienceOutlinedIcon />},
  Sulfates: {label: 'Concentration en sulfates', icon: <ScienceOutlinedIcon />},
  Ph: {label: 'Ph', icon: <BloodtypeOutlinedIcon />},
  Turbidité: {label: 'Turbidité', icon: <LocalDrinkOutlinedIcon />}
}

const regleContrainte = {
  minimum: '>',
  maximum: '<',
  moyenne: '≃'
}

export const getParametreInfo = parametre => regleParametres[parametre]
export const getRegleContrainte = contrainte => regleContrainte[contrainte]

/**
 * Check if a date (month/day) falls within a seasonal period.
 * Handles periods that cross the year boundary (e.g., Nov 15 to Mar 15).
 * @param {Date} date - The date to check
 * @param {Date} debutPeriode - Start of the seasonal period
 * @param {Date} finPeriode - End of the seasonal period
 * @returns {boolean} True if the date is within the period
 */
const isInSeasonalPeriod = (date, debutPeriode, finPeriode) => {
  const currentMonth = date.getMonth()
  const currentDay = date.getDate()
  const startMonth = debutPeriode.getMonth()
  const startDay = debutPeriode.getDate()
  const endMonth = finPeriode.getMonth()
  const endDay = finPeriode.getDate()

  // Convert to day-of-year style comparison (month * 100 + day)
  const currentValue = (currentMonth * 100) + currentDay
  const startValue = (startMonth * 100) + startDay
  const endValue = (endMonth * 100) + endDay

  // Period does not cross year boundary (e.g., Apr 1 to Sep 30)
  if (startValue <= endValue) {
    return currentValue >= startValue && currentValue <= endValue
  }

  // Period crosses year boundary (e.g., Nov 15 to Mar 15)
  return currentValue >= startValue || currentValue <= endValue
}

/**
 * Determine the status of a rule based on validity dates and seasonal period.
 * @param {object} regle - The rule object
 * @param {Date} [today] - Reference date (defaults to now)
 * @returns {'active' | 'hors-saison' | 'a-venir' | 'obsolete'} The rule status
 */
export const getRegleStatus = (regle, today = new Date()) => {
  const debutValidite = safeParseDate(regle.debut_validite)
  const finValidite = safeParseDate(regle.fin_validite)
  const debutPeriode = safeParseDate(regle.debut_periode)
  const finPeriode = safeParseDate(regle.fin_periode)

  // Check if the rule is obsolete (end validity date has passed)
  if (finValidite && finValidite < today) {
    return 'obsolete'
  }

  // Check if the rule is in the future (start validity date not yet reached)
  if (debutValidite && debutValidite > today) {
    return 'a-venir'
  }

  // Rule is currently valid, check if it's seasonal
  if (debutPeriode && finPeriode) {
    const inSeason = isInSeasonalPeriod(today, debutPeriode, finPeriode)
    return inSeason ? 'active' : 'hors-saison'
  }

  // Rule is active (no seasonal period or within validity)
  return 'active'
}

/**
 * Sort rules by status: active > hors-saison > a-venir > obsolete
 * Within each group, sort by debut_validite (most recent first)
 * @param {object[]} regles - Array of rules
 * @returns {object[]} Sorted array of rules
 */
export const sortReglesByStatus = regles => {
  const statusOrder = {
    active: 0,
    'hors-saison': 1,
    'a-venir': 2,
    obsolete: 3
  }

  return [...regles].sort((a, b) => {
    const statusA = getRegleStatus(a)
    const statusB = getRegleStatus(b)

    // First sort by status
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB]
    }

    // Within same status, sort by debut_validite (most recent first)
    const dateA = safeParseDate(a.debut_validite)
    const dateB = safeParseDate(b.debut_validite)

    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime()
    }

    if (dateA) {
      return -1
    }

    if (dateB) {
      return 1
    }

    return 0
  })
}
