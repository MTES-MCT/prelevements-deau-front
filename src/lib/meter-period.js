const exactInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

function readPeriod(value) {
  if (!exactInstant.test(value?.periodStart ?? '') || !exactInstant.test(value?.periodEnd ?? '')) return null
  const start = new Date(value.periodStart)
  const end = new Date(value.periodEnd)
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start ? {start, end} : null
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
  return readPeriod(source?.metadata) ?? mergePeriods((source?.chunks ?? []).map(item => getMeterPeriod(source, item)))
}

export function formatMeterCoveredPeriod(period) {
  if (!period) return null
  const formatter = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', dateStyle: 'short'})
  const start = formatter.format(period.start)
  const end = formatter.format(new Date(period.end.getTime() - 1))
  return start === end ? start : `${start} au ${end}`
}

export function formatMeterExactPeriod(period) {
  if (!period) return 'Période exacte non renseignée'
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    ...(period.start.getUTCMilliseconds() || period.end.getUTCMilliseconds() ? {fractionalSecondDigits: 3} : {})
  })
  return `Du ${formatter.format(period.start)} au ${formatter.format(period.end)}`
}

export function getMeterValuePeriod(value) {
  return readPeriod(value)
}
