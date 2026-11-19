const exactInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const parisDateTime = {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
}
const clock = new Intl.DateTimeFormat('fr-FR', parisDateTime)
const clockMillis = new Intl.DateTimeFormat('fr-FR', {...parisDateTime, fractionalSecondDigits: 3})
const offsetClock = new Intl.DateTimeFormat('fr-FR', {...parisDateTime, timeZoneName: 'shortOffset'})
const offsetClockMillis = new Intl.DateTimeFormat('fr-FR', {...parisDateTime, fractionalSecondDigits: 3, timeZoneName: 'shortOffset'})

export function parseExactInstant(value) {
  if (!exactInstant.test(value ?? '')) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function readPeriod(value) {
  const start = parseExactInstant(value?.periodStart)
  const end = parseExactInstant(value?.periodEnd)
  return start !== null && end !== null && end > start ? {start: new Date(start), end: new Date(end)} : null
}

function mergePeriods(periods) {
  const available = periods.filter(Boolean)
  if (available.length === 0) return null
  return {
    start: new Date(Math.min(...available.map(period => period.start.getTime()))),
    end: new Date(Math.max(...available.map(period => period.end.getTime())))
  }
}

export function isMeterPeriodSource(source, chunk) {
  return source?.metadata?.calculationStrategy === 'METER' || chunk?.calculationStrategy === 'METER'
}

// Legacy minDate/maxDate can be date-only database fields: never reinterpret
// them as exact meter instants, even when the original source was telemetry.
export function getMeterPeriod(source, chunk) {
  if (!isMeterPeriodSource(source, chunk)) return null
  if (chunk) return readPeriod(chunk.metadata) ?? mergePeriods((chunk.chunkValues ?? []).map(readPeriod))
  return readPeriod(source?.metadata) ?? mergePeriods((source?.chunks ?? [])
    .filter(item => item.instructionStatus !== 'REJECTED').map(item => getMeterPeriod(source, item)))
}

export function formatMeterCoveredPeriod(period) {
  if (!period) return null
  const formatter = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', dateStyle: 'short'})
  const start = formatter.format(period.start)
  const end = formatter.format(new Date(period.end.getTime() - 1))
  return start === end ? start : `${start} au ${end}`
}

export function isRepeatedParisHour(timestamp) {
  // When the clocks go back, two distinct readings have the same Paris date and time.
  const hour = 3_600_000
  const label = clock.format(timestamp)
  return clock.format(timestamp - hour) === label || clock.format(timestamp + hour) === label
}

export function formatParisInstant(timestamp, withMillis = timestamp % 1000 !== 0) {
  const formatter = isRepeatedParisHour(timestamp)
    ? (withMillis ? offsetClockMillis : offsetClock) : (withMillis ? clockMillis : clock)
  return formatter.format(timestamp)
}

export function formatMeterExactPeriod(period) {
  if (!period) return 'Période exacte non renseignée'
  const withMillis = Boolean(period.start.getUTCMilliseconds() || period.end.getUTCMilliseconds())
  return `Du ${formatParisInstant(period.start.getTime(), withMillis)} au ${formatParisInstant(period.end.getTime(), withMillis)}`
}

export function getMeterValuePeriod(value) {
  return readPeriod(value)
}
