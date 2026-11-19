import {isIndexMetricType, isVolumeMetricType} from './declaration-index-readings.js'
import {getMeterValuePeriod, isMeterPeriodSource, isRepeatedParisHour, parseExactInstant} from './meter-period.js'
import {POINT_FLOW_TYPES} from './point-flow-types.js'
import {coerceNumericValue} from '../utils/number.js'

const numberFormat = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 30})
const readingDate = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric',
  hour: 'numeric', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset'
})

function parisReadingDate(timestamp) {
  const parts = Object.fromEntries(readingDate.formatToParts(timestamp).map(({type, value}) => [type, value]))
  const day = parts.day === '1' ? '1er' : parts.day
  const millis = new Date(timestamp).getUTCMilliseconds()
  let time = Number(parts.hour) + ' h'
  if (Number(parts.second) || millis) {
    const fraction = millis ? ',' + String(millis).padStart(3, '0') : ''
    time += ' ' + parts.minute + ' min ' + parts.second + fraction + ' s'
  } else if (Number(parts.minute)) {
    time += ' ' + parts.minute
  }
  if (isRepeatedParisHour(timestamp)) time += ' ' + parts.timeZoneName
  return {day, month: parts.month, year: parts.year, full: day + ' ' + parts.month + ' ' + parts.year, time}
}

export function formatTelemetryRange(start, end = start) {
  const first = parisReadingDate(start)
  if (start === end) return 'Le ' + first.full + ' à ' + first.time
  const last = parisReadingDate(end)
  if (first.full === last.full) return 'Le ' + first.full + ', de ' + first.time + ' à ' + last.time
  const firstDay = first.year !== last.year ? first.full : first.day + ' ' + first.month
  if (first.time === last.time) {
    const sameMonth = first.year === last.year && first.month === last.month
    return 'Du ' + (sameMonth ? first.day : firstDay) + ' au ' + last.full + ' à ' + first.time
  }
  return 'Du ' + firstDay + ' à ' + first.time + ' au ' + last.full + ' à ' + last.time
}

export function getTelemetryKind(value) {
  if (isIndexMetricType(value.metricTypeCode)) return 'index'
  if (isVolumeMetricType(value.metricTypeCode)) return value.valueKind === 'COMPUTED' ? 'computed' : 'direct'
  return 'other'
}

export function getTelemetryLabel(value, chunk) {
  const kind = getTelemetryKind(value)
  if (kind === 'index') return 'Index télérelevé'
  const flow = chunk?.flowType ?? chunk?.pointPrelevement?.flowType
  const code = value.metricTypeCode
  let metric = code ? code.charAt(0).toUpperCase() + code.slice(1) : 'Mesure'
  if (code === 'volume' || code === 'débit') {
    if (flow === POINT_FLOW_TYPES.REJET) metric += ' rejeté'
    if (flow === POINT_FLOW_TYPES.PRELEVEMENT) metric += ' prélevé'
  }
  if (kind === 'computed') return metric + ' calculé'
  if (kind === 'direct') return metric + ' télérelevé'
  if (value.valueKind === 'COMPUTED') return metric + ' (calcul)'
  return metric
}

export function normalizeTelemetryUnit(unit) {
  return unit?.replace(/^m3(?=$|\/)/, 'm³') ?? ''
}

export function formatTelemetryAmount(value) {
  if (coerceNumericValue(value?.value) === null) return 'Non renseignée'
  // Preserve the API's exact decimal string even when it exceeds JS number precision.
  const decimal = typeof value.value === 'string' ? value.value.replaceAll(/\s/g, '').replaceAll(',', '.') : value.value
  return [numberFormat.format(decimal), normalizeTelemetryUnit(value.unit)].filter(Boolean).join(' ')
}

export function getTelemetryTimes(value, source, chunk) {
  const volume = isVolumeMetricType(value.metricTypeCode)
  if (volume && isMeterPeriodSource(source, chunk)) {
    const period = getMeterValuePeriod(value)
    return {start: period?.start.getTime() ?? null, end: period?.end.getTime() ?? null}
  }
  const start = parseExactInstant(value.periodStart)
  const end = parseExactInstant(value.periodEnd)
  if (isIndexMetricType(value.metricTypeCode)) {
    const instant = value.periodEnd == null ? start : end
    return {start: instant, end: instant}
  }
  if (start !== null && end !== null && start <= end) return {start, end}
  if (!volume && (value.periodStart == null || value.periodEnd == null)) {
    const instant = start ?? end
    return {start: instant, end: instant}
  }
  return {start: null, end: null}
}

export function formatTelemetryWhen(value, source, chunk) {
  const {start, end} = getTelemetryTimes(value, source, chunk)
  if (end === null) return isVolumeMetricType(value.metricTypeCode) ? 'Période exacte non renseignée' : 'Date non renseignée'
  return formatTelemetryRange(start, end)
}
