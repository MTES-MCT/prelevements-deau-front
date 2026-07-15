import {isIpsPiezometryPeriod} from './piezometry.js'

export const DEFAULT_FLOW_PERIOD = 'week'
export const DEFAULT_PIEZOMETRY_MODE = 'ips'
export const DEFAULT_PIEZOMETRY_PERIOD = 'year'

export const PIEZOMETRY_PERIODS = [
  {value: 'week', label: '7 jours'},
  {value: 'month', label: '30 jours'},
  {value: 'year', label: '12 mois'},
  {value: 'five-years', label: '5 ans'},
  {value: 'ten-years', label: '10 ans'},
  {value: 'twenty-years', label: '20 ans'}
]

export const PIEZOMETRY_IPS_PERIODS = PIEZOMETRY_PERIODS.filter(period =>
  isIpsPiezometryPeriod(period.value))

export const FLOW_PERIODS = [
  {value: 'week', label: '7 jours'},
  {value: 'month', label: '30 jours'},
  {value: 'year', label: '12 mois'}
]

export const PIEZOMETRY_MODES = [
  {value: 'depth', label: 'Profondeur'},
  {value: 'ips', label: 'Écart à la normale'},
  {value: 'level', label: 'Cote NGF'}
]

function getDefaultPiezometryPeriod(mode) {
  return mode === 'ips' ? DEFAULT_PIEZOMETRY_PERIOD : 'month'
}

export function readResourceHash(rawHash) {
  if (!rawHash?.startsWith('#dashboard?')) {
    return null
  }

  const parameters = new URLSearchParams(rawHash.slice('#dashboard?'.length))
  const requestedPiezometryMode = parameters.get('piezoMode')
  const normalizedPiezometryMode = requestedPiezometryMode === 'relative'
    ? 'ips'
    : requestedPiezometryMode
  const piezometryMode = PIEZOMETRY_MODES.some(item => item.value === normalizedPiezometryMode)
    ? normalizedPiezometryMode
    : DEFAULT_PIEZOMETRY_MODE
  const requestedPiezometryPeriod = parameters.get('piezoPeriod')
  let piezometryPeriod = PIEZOMETRY_PERIODS.some(item => item.value === requestedPiezometryPeriod)
    ? requestedPiezometryPeriod
    : getDefaultPiezometryPeriod(piezometryMode)

  if (piezometryMode === 'ips' && !isIpsPiezometryPeriod(piezometryPeriod)) {
    piezometryPeriod = DEFAULT_PIEZOMETRY_PERIOD
  }

  const requestedFlowPeriod = parameters.get('flowPeriod')

  return {
    piezometryPeriod,
    flowPeriod: FLOW_PERIODS.some(item => item.value === requestedFlowPeriod)
      ? requestedFlowPeriod
      : DEFAULT_FLOW_PERIOD,
    piezometryMode
  }
}

export function buildResourceHash(rawHash, {
  flowPeriod,
  piezometryMode,
  piezometryPeriod
}) {
  const rawSearch = rawHash?.startsWith('#dashboard?')
    ? rawHash.slice('#dashboard?'.length)
    : ''
  const parameters = new URLSearchParams(rawSearch)
  const defaultPiezometryPeriod = getDefaultPiezometryPeriod(piezometryMode)

  if (piezometryPeriod === defaultPiezometryPeriod) {
    parameters.delete('piezoPeriod')
  } else {
    parameters.set('piezoPeriod', piezometryPeriod)
  }

  if (flowPeriod === DEFAULT_FLOW_PERIOD) {
    parameters.delete('flowPeriod')
  } else {
    parameters.set('flowPeriod', flowPeriod)
  }

  if (piezometryMode === DEFAULT_PIEZOMETRY_MODE) {
    parameters.delete('piezoMode')
  } else {
    parameters.set('piezoMode', piezometryMode)
  }

  const search = parameters.toString()
  return search ? `#dashboard?${search}` : ''
}
