const UUID_SEGMENT_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
const NUMERIC_SEGMENT_PATTERN = /^\d+$/

export const REPORTED_WEB_VITALS = new Set(['CLS', 'INP', 'LCP', 'TTFB'])

export function normalizeRoutePattern(pathname = '/') {
  const path = pathname.split('?')[0] || '/'

  return path
    .split('/')
    .map(segment => (
      UUID_SEGMENT_PATTERN.test(segment) || NUMERIC_SEGMENT_PATTERN.test(segment)
        ? '[id]'
        : segment
    ))
    .join('/') || '/'
}

export function getMatomoMetricValue(metric) {
  const scale = metric.name === 'CLS' ? 1000 : 1
  return Math.round(metric.value * scale)
}
