const UUID_PATTERN = /\b[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\b/gi
const NUMERIC_SEGMENT_PATTERN = /^\d+$/

export function getApiPerformancePath(url) {
  return String(url)
    .split('?')[0]
    .split('/')
    .map(segment => {
      const normalizedSegment = segment.replaceAll(UUID_PATTERN, ':id')

      return NUMERIC_SEGMENT_PATTERN.test(normalizedSegment)
        || normalizedSegment.includes(':id')
        ? ':id'
        : normalizedSegment
    })
    .join('/')
}

export function getApiSlowRequestThreshold(value, fallback = 1000) {
  const threshold = Number(value)
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : fallback
}
