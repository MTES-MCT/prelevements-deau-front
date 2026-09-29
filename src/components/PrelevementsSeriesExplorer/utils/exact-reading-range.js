const calendarDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** API calendar dates use the meter timezone; observedAt remains the real instant. */
export function isSampleInCalendarRange(sample, start, endExclusive) {
  if (!sample?.timestamp) return false
  return sample.observedAt
    ? sample.date >= calendarDate(start) && sample.date < calendarDate(endExclusive)
    : sample.timestamp >= start && sample.timestamp < endExclusive
}

export function includeExactReadingBounds(range, samples) {
  if (!range?.start || !range?.end) return range
  let start = range.start
  let end = range.end
  const inclusiveEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, 0, -1)
  for (const sample of samples) {
    if (!sample.observedAt) continue
    if (sample.timestamp < start) start = sample.timestamp
    if (sample.timestamp > inclusiveEnd && sample.timestamp > end) end = sample.timestamp
  }

  return {start, end}
}
