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

export const parameterUnits = {
  volume: ['m³'],
  index: ['m³'],
  débit: ['L/s', 'm³/h'],
  'débit réservé': ['L/s', 'm³/h'],
  chlorures: ['mg/L'],
  nitrates: ['mg/L'],
  sulfates: ['mg/L'],
  température: ['degrés Celsius'],
  'niveau piézométrique': ['m NGR'],
  conductivité: ['µS/cm'],
  pH: []
}

const ruleParameters = {
  volume: {
    '1 day': {label: 'Volume journalier', icon: <OpacityOutlinedIcon />},
    '1 month': {label: 'Volume mensuel', icon: <OpacityOutlinedIcon />},
    '1 year': {label: 'Volume annuel', icon: <OpacityOutlinedIcon />},
    default: {label: 'Volume', icon: <OpacityOutlinedIcon />}
  },
  index: {label: 'Relevé d’index', icon: <OpacityOutlinedIcon />},
  débit: {label: 'Débit', icon: <OilBarrelOutlinedIcon />},
  'débit réservé': {label: 'Débit réservé', icon: <WaterOutlinedIcon />},
  'niveau piézométrique': {label: 'Niveau piézométrique', icon: <HeightOutlinedIcon />},
  conductivité: {label: 'Conductivité', icon: <OfflineBoltOutlinedIcon />},
  température: {label: 'Température', icon: <DeviceThermostatOutlinedIcon />},
  chlorures: {label: 'Concentration en chlorures', icon: <ScienceOutlinedIcon />},
  nitrates: {label: 'Concentration en nitrates', icon: <ScienceOutlinedIcon />},
  sulfates: {label: 'Concentration en sulfates', icon: <ScienceOutlinedIcon />},
  pH: {label: 'pH', icon: <BloodtypeOutlinedIcon />},
  turbidité: {label: 'Turbidité', icon: <LocalDrinkOutlinedIcon />}
}

const ruleConstraint = {
  MIN: '>',
  MAX: '<'
}

export const getParameterInfo = (parameter, frequency) => {
  const normalizedParameter = {
    'volume prélevé': 'volume',
    'volume rejeté': 'volume',
    'relevé d\'index': 'index',
    'débit prélevé': 'débit'
  }[parameter] ?? parameter
  const parameterData = ruleParameters[normalizedParameter]
  if (!parameterData) {
    return null
  }

  if (normalizedParameter === 'volume' && typeof parameterData === 'object' && !parameterData.label) {
    return parameterData[frequency] || parameterData.default
  }

  return parameterData
}

export const getParametreInfo = getParameterInfo

export const getConstraintLabel = constraint => ruleConstraint[constraint]
export const getRegleContrainte = getConstraintLabel

const isInSeasonalPeriod = (date, annualPeriodStartDate, annualPeriodEndDate) => {
  const currentMonth = date.getMonth()
  const currentDay = date.getDate()
  const startMonth = annualPeriodStartDate.getMonth()
  const startDay = annualPeriodStartDate.getDate()
  const endMonth = annualPeriodEndDate.getMonth()
  const endDay = annualPeriodEndDate.getDate()

  const currentValue = (currentMonth * 100) + currentDay
  const startValue = (startMonth * 100) + startDay
  const endValue = (endMonth * 100) + endDay

  if (startValue <= endValue) {
    return currentValue >= startValue && currentValue <= endValue
  }

  return currentValue >= startValue || currentValue <= endValue
}

export const getRegleStatus = (regle, today = new Date()) => {
  const validityStartDate = safeParseDate(regle.validityStartDate)
  const validityEndDate = safeParseDate(regle.validityEndDate)
  const annualPeriodStartDate = safeParseDate(regle.annualPeriodStartDate)
  const annualPeriodEndDate = safeParseDate(regle.annualPeriodEndDate)

  if (validityEndDate && validityEndDate < today) {
    return 'obsolete'
  }

  if (validityStartDate && validityStartDate > today) {
    return 'a-venir'
  }

  if (annualPeriodStartDate && annualPeriodEndDate) {
    const inSeason = isInSeasonalPeriod(today, annualPeriodStartDate, annualPeriodEndDate)
    return inSeason ? 'active' : 'hors-saison'
  }

  return 'active'
}

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

    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB]
    }

    const dateA = safeParseDate(a.validityStartDate)
    const dateB = safeParseDate(b.validityStartDate)

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
