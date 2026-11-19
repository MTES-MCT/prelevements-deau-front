import {formatTelemetryRange} from './telemetry-reading.js'
import {exactVolumeUnits} from './quick-reading-chart.js'

const second = 1000
const minute = 60 * second
const hour = 60 * minute
const day = 24 * hour
const timeZone = 'Europe/Paris'
const formatter = options => new Intl.DateTimeFormat('fr-FR', {timeZone, ...options})
const civilDate = new Intl.DateTimeFormat('sv-SE', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'})
const dayLabel = formatter({day: 'numeric', month: 'short'})
const fullDay = formatter({dateStyle: 'long'})
const fullMonth = formatter({year: 'numeric', month: 'long'})
const shortMonth = formatter({month: 'short'})
const hourLabel = formatter({hour: '2-digit', minute: '2-digit'})
const secondLabel = formatter({hour: '2-digit', minute: '2-digit', second: '2-digit'})
const milliLabel = formatter({hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3})
const parisOffset = formatter({timeZoneName: 'longOffset'})
const monday = Date.UTC(1970, 0, 5)

const scales = [
  ['second', 1], ['second', 10], ['second', 100], ['second', second], ['second', 10 * second],
  ['minute', minute], ['minute', 5 * minute], ['minute', 15 * minute],
  ['hour', hour], ['hour', 3 * hour], ['hour', 6 * hour],
  ['day', day], ['week', 7 * day], ['month', 31 * day], ['year', 365 * day]
]

// A UTC date here represents Paris calendar fields, not an instant. Paris DST
// changes happen after midnight, so its offset at 00:00 UTC is also the offset
// at local midnight. Calendar bins can consequently be 23 or 25 hours long.
function parisMidnight(civil) {
  const offset = parisOffset.formatToParts(civil).find(part => part.type === 'timeZoneName').value
  const match = /UTC([+−-])(\d+):(\d+)(?::(\d+))?/.exec(offset)
  const length = match ? Number(match[2]) * hour + Number(match[3]) * minute + Number(match[4] ?? 0) * second : 0
  return civil - (match?.[1] === '+' ? length : -length)
}

function calendarBounds(time, grain, step) {
  if (step < day) {
    const start = Math.floor(time / step) * step
    return [start, start + step]
  }
  const [year, month, date] = civilDate.format(time).split('-').map(Number)
  let civil = Date.UTC(year, month - 1, date)
  if (grain === 'week') civil = monday + Math.floor((civil - monday) / (7 * day)) * 7 * day
  if (grain === 'month') return [parisMidnight(Date.UTC(year, month - 1)), parisMidnight(Date.UTC(year, month))]
  if (grain === 'year') {
    const years = Math.round(step / (365 * day))
    const first = Math.floor(year / years) * years
    return [parisMidnight(Date.UTC(first, 0)), parisMidnight(Date.UTC(first + years, 0))]
  }
  return [parisMidnight(civil), parisMidnight(civil + step)]
}

function bucketLabels(start, end, grain, step) {
  const date = civilDate.format(start)
  if (grain === 'month') return {key: date.slice(0, 7), label: fullMonth.format(start), shortLabel: shortMonth.format(start)}
  if (grain === 'year') {
    const first = date.slice(0, 4)
    const last = civilDate.format(end - 1).slice(0, 4)
    const label = first === last ? first : first + '–' + last
    return {key: first, label, shortLabel: label}
  }
  if (grain === 'week' || grain === 'day') {
    const label = grain === 'day' ? fullDay.format(start) : 'Du ' + dayLabel.format(start) + ' au ' + fullDay.format(end - 1)
    return {key: date, label, shortLabel: dayLabel.format(start)}
  }
  const clock = step < second ? milliLabel : step < minute ? secondLabel : hourLabel
  const label = formatTelemetryRange(start)
  return {key: new Date(start).toISOString(), label, shortLabel: clock.format(start)}
}

function decimalString(units) {
  const digits = units.toString().padStart(31, '0')
  const fraction = digits.slice(-30).replace(/0+$/, '')
  return digits.slice(0, -30) + (fraction ? '.' + fraction : '')
}

function overlappingPeriods(rows) {
  // Sweep the original intervals, including those that end in different bins.
  const overlaps = new Set()
  for (const kind of ['direct', 'computed']) {
    const byStart = rows.filter(row => row.kind === kind).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    let latestEnd
    for (const row of byStart) {
      if (latestEnd && (Date.parse(row.start) < Date.parse(latestEnd.end) ||
        (row.start === latestEnd.start && row.end === latestEnd.end))) {
        overlaps.add(row)
        overlaps.add(latestEnd)
      }
      if (!latestEnd || Date.parse(row.end) > Date.parse(latestEnd.end)) latestEnd = row
    }
  }
  return overlaps
}

function volumeMarks(rows, unit, overlaps) {
  const marks = []
  for (const kind of ['computed', 'direct']) {
    const group = rows.filter(row => row.kind === kind)
    if (!group.length) continue
    const overlapping = group.some(row => overlaps.has(row))
    let sum = 0n
    for (const row of group) {
      const units = exactVolumeUnits(row.value.value)
      if (units === null || overlapping) {
        sum = null
        break
      }
      sum += units
    }
    const value = sum === null ? null : decimalString(sum)
    const start = group.reduce((first, row) => Date.parse(row.start) < Date.parse(first) ? row.start : first, group[0].start)
    marks.push({kind, name: group[0].name, count: group.length, start, end: group.at(-1).end,
      amount: value === null ? null : Number(value), value: {value, unit}, overlapping, connect: false})
  }
  return marks
}

function indexMark(rows, previous, unit) {
  const row = rows.at(-1)
  const lastUnits = exactVolumeUnits(row.value.value)
  const ambiguous = rows.some(other => other !== row && other.day === row.day && exactVolumeUnits(other.value.value) !== lastUnits)
  // Check all intermediate observations. A meter can reset and surpass the
  // preceding month's closing index before the current month ends.
  const connect = Boolean(previous) && rows.every((current, i) => {
    const before = i ? rows[i - 1] : previous
    const a = exactVolumeUnits(before.value.value)
    const b = exactVolumeUnits(current.value.value)
    return a !== null && b !== null && (before.day === current.day ? a === b : a <= b)
  })
  return {kind: 'index', name: row.name, count: rows.length, row: ambiguous ? null : row, start: row.day, end: row.day,
    amount: ambiguous ? null : row.amount, value: {value: ambiguous ? null : row.value.value, unit}, overlapping: false, connect}
}

export function buildTelemetryOverview(panels) {
  const series = panels.map(panel => panel.rows.filter(row => {
    if (!row || !Number.isFinite(row.amount) || row.amount < 0 || !Number.isFinite(Date.parse(row.day))) return false
    if (panel.indexes) return row.kind === 'index'
    return (row.kind === 'computed' || row.kind === 'direct') && Date.parse(row.start) <= Date.parse(row.end)
  }).sort((a, b) => Date.parse(a.day) - Date.parse(b.day)))
  const populated = series.filter(rows => rows.length)
  if (!populated.length) return {grain: 'day', buckets: []}
  const first = Math.min(...populated.map(rows => Date.parse(rows[0].day)))
  const last = Math.max(...populated.map(rows => Date.parse(rows.at(-1).day)))
  const target = (last - first) / 12
  const [grain, step] = scales.find(([, duration]) => duration >= target) ??
    ['year', Math.ceil(target / (365 * day)) * 365 * day]

  const buckets = []
  for (let cursor = first; cursor <= last;) {
    const [start, end] = calendarBounds(cursor, grain, step)
    buckets.push({start, end, ...bucketLabels(start, end, grain, step), panels: []})
    cursor = end
  }
  for (const [i, panel] of panels.entries()) {
    const seriesRows = series[i]
    const overlaps = panel.indexes ? null : overlappingPeriods(seriesRows)
    let cursor = 0
    let previous = null
    for (const bucket of buckets) {
      const begin = cursor
      // Attribute a complete interval to its closing instant in Paris (00:00
      // belongs to the new month). Retain the exact source interval in detail.
      while (cursor < seriesRows.length && Date.parse(seriesRows[cursor].day) < bucket.end) cursor++
      const rows = seriesRows.slice(begin, cursor)
      const marks = panel.indexes
        ? (rows.length ? [indexMark(rows, previous, panel.unit)] : [])
        : volumeMarks(rows, panel.unit, overlaps)
      previous = panel.indexes ? marks[0]?.row : null
      bucket.panels.push({...panel, rows, marks})
    }
  }
  return {grain, buckets}
}
