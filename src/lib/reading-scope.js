const dayMs = 86_400_000

export function getReadingMarkRange(row, {exactTimes = false} = {}) {
  if (row.start == null && row.end == null) {
    const instant = Date.parse(row.day)
    return {start: instant, end: instant}
  }
  const start = Date.parse(row.start)
  const end = Date.parse(row.end)
  // The quick-entry calendar draws the whole last civil day of an entered volume.
  // Computed volumes stop at the closing index. Telemetry uses its exact instants.
  return {start, end: row.direct && !exactTimes && end >= start ? end + dayMs : end}
}

export function getReadingScopeRanges(rows, options) {
  const ranges = rows.filter(row => row.current)
    .map(row => getReadingMarkRange(row, options))
    .filter(({start, end}) => Number.isFinite(start) && Number.isFinite(end) && start <= end)
    .sort((a, b) => a.start - b.start)
  const merged = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push(range)
  }
  return merged
}
