const HISTORICAL_PERIODS = new Set(['five-years', 'ten-years', 'twenty-years'])
const IPS_PERIODS = new Set(['year', ...HISTORICAL_PERIODS])

export const PIEZOMETRY_IPS_BANDS = [
  {
    minimum: -3, maximum: -1.28, color: 'rgba(225, 0, 15, 0.12)', label: 'Très bas'
  },
  {
    minimum: -1.28, maximum: -0.84, color: 'rgba(228, 121, 74, 0.13)', label: 'Bas'
  },
  {
    minimum: -0.84, maximum: -0.25, color: 'rgba(252, 198, 58, 0.15)', label: 'Modérément bas'
  },
  {
    minimum: -0.25, maximum: 0.25, color: 'rgba(0, 169, 95, 0.11)', label: 'Normal'
  },
  {
    minimum: 0.25, maximum: 0.84, color: 'rgba(106, 106, 244, 0.10)', label: 'Modérément haut'
  },
  {
    minimum: 0.84, maximum: 1.28, color: 'rgba(65, 125, 196, 0.12)', label: 'Haut'
  },
  {
    minimum: 1.28, maximum: 3, color: 'rgba(0, 0, 145, 0.11)', label: 'Très haut'
  }
]

export function isHistoricalPiezometryPeriod(period) {
  return HISTORICAL_PERIODS.has(period)
}

export function isIpsPiezometryPeriod(period) {
  return IPS_PERIODS.has(period)
}

export function getPiezometryYAxisConfig(mode) {
  if (mode === 'level') {
    return {
      label: 'Cote (m NGF)', reverse: false, minimum: null, maximum: null
    }
  }

  if (mode === 'ips') {
    return {
      label: 'IPS mensuel', reverse: false, minimum: -3, maximum: 3
    }
  }

  return {
    label: 'Profondeur (m)', reverse: true, minimum: null, maximum: null
  }
}
