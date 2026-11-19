import {coerceNumericValue} from '../utils/number.js'

// Quick declarations use civil dates. The chart does not interpolate index
// readings or derive a volume when PE has not returned a computed period.
export function quickReadingDay(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : null
}

export function indexReadingsByDay(indexes) {
  const byDay = new Map()
  for (const point of indexes) {
    byDay.set(point.day, byDay.has(point.day) ? null : point)
  }
  return byDay
}

// ChunkValue is stored as Decimal(53, 30). Compare in this unit so a small
// difference between large meter readings cannot disappear through rounding.
export function exactVolumeUnits(value) {
  const text = String(value ?? '').replaceAll(/\s/g, '').replace(',', '.')
  const match = /^\+?(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text)
  if (!match || (!match[1] && !match[2])) return null
  const [, integer, fraction = '', exponent = '0'] = match
  const coefficient = (integer + fraction).replace(/^0+/, '')
  if (!coefficient) return 0n
  const digits = coefficient.replace(/0+$/, '')
  const shift = 30 + Number(exponent) - fraction.length + coefficient.length - digits.length
  if (shift < 0 || digits.length + shift > 53) return null
  return BigInt(digits) * 10n ** BigInt(shift)
}

export function getIndexIntervalBounds(interval, indexesByDay) {
  if (interval.direct || interval.start >= interval.end) return null
  const start = indexesByDay.get(interval.start)
  const end = indexesByDay.get(interval.end)
  if (!start || !end) return null
  const unit = interval.value.unit ?? 'm³'
  if ((start.value.unit ?? 'm³') !== unit || (end.value.unit ?? 'm³') !== unit) return null

  const first = exactVolumeUnits(start.value.value)
  const last = exactVolumeUnits(end.value.value)
  const volume = exactVolumeUnits(interval.value.value)
  return first !== null && last !== null && volume !== null && last - first === volume ? {start, end} : null
}

export function volumePeriod(value, declared) {
  const start = quickReadingDay(value.periodStartDate ?? value.periodStart)
  let end = quickReadingDay(value.periodEndDate ?? value.periodEnd)
  const direct = value.valueKind ? value.valueKind === 'DECLARED' : declared
  // Direct volumes have an exclusive storage end unless business dates are present.
  if (direct && !value.periodEndDate && end && end > start) {
    end = quickReadingDay(Date.parse(end) - 1)
  }
  return {start, end, direct}
}

export function quickReadingContextLabel(row) {
  if (row.current) return 'Cette déclaration'
  return row.scope === 'following' ? 'Déclaration ultérieure' : 'Historique'
}

export function buildQuickReadingChart({readings = [], history = [], volumes = [], volumeHistory = [], following, declared = false}) {
  const indexes = new Map()
  const intervals = new Map()
  const endDays = [...readings.map(row => quickReadingDay(row.date)), ...volumes.map(row => volumePeriod(row, declared).end)].filter(Boolean)
  const cutoff = endDays.sort().at(-1)
  const subsequentIndexes = (following?.indexes ?? []).map(value => ({
    value, date: value.readingDate ?? value.periodStart ?? value.periodEnd
  }))
  // Older APIs can include unrelated later dates in their index history. Only the
  // explicitly scoped following lists can extend the chart beyond this receipt.
  const groups = [
    {scope: 'following', readings: subsequentIndexes, volumes: following?.volumes ?? []},
    {scope: 'history', readings: history, volumes: volumeHistory},
    {scope: 'current', readings, volumes}
  ]
  for (const group of groups) {
    const {scope} = group
    const current = scope === 'current'
    const inScope = day => scope === 'following' ? cutoff && day > cutoff : current || !cutoff || day <= cutoff
    for (const {value, date} of group.readings) {
      const day = quickReadingDay(date)
      const amount = coerceNumericValue(value.value)
      const key = 'index-' + (value.id ?? JSON.stringify([value.periodStart ?? date, value.value]))
      if (!day || !inScope(day) || amount === null || value.isOverwritten || value.valueStatus === 'OVERWRITTEN') {
        if (current) indexes.delete(key)
        continue
      }
      indexes.set(key, {key, day, amount, value, scope, current})
    }
    for (const value of group.volumes) {
      const amount = coerceNumericValue(value.value)
      const {start, end, direct} = volumePeriod(value, declared)
      const key = 'volume-' + (value.id ?? [start, end, value.value].join('/'))
      if (amount === null || amount < 0 || !start || !end || end < start || !inScope(end)
        || value.isOverwritten || value.valueStatus === 'OVERWRITTEN') {
        if (current) intervals.delete(key)
        continue
      }
      intervals.set(key, {key, start, end, day: end, amount, value, direct, scope, current})
    }
  }
  const byDate = (a, b) => a.day.localeCompare(b.day)
  return {indexes: [...indexes.values()].sort(byDate), intervals: [...intervals.values()].sort(byDate)}
}
