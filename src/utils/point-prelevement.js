export const MAX_POINT_USAGE_NAME_LENGTH = 200

export function normalizePointUsageName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getPointPrelevementName(pointPrelevement) {
  if (!pointPrelevement) {
    return ''
  }

  return pointPrelevement.name
    || pointPrelevement.otherNames
    || ''
}

export function getPointPrelevementDisplayName(pointPrelevement, {
  fallback = '',
  preferUsageName = false,
  usageName = pointPrelevement?.usageName
} = {}) {
  const pointName = preferUsageName
    ? normalizePointUsageName(usageName) || getPointPrelevementName(pointPrelevement)
    : getPointPrelevementName(pointPrelevement)

  return pointName || fallback
}

export function getPointPrelevementTechnicalReference(pointPrelevement, options = {}) {
  const technicalName = getPointPrelevementName(pointPrelevement)
  const displayName = getPointPrelevementDisplayName(pointPrelevement, options)

  return technicalName && technicalName !== displayName ? technicalName : null
}

export function getPointPrelevementLabel({
  pointPrelevement,
  fallback = 'Point de prélèvement',
  preferUsageName = false
}) {
  const pointName = getPointPrelevementDisplayName(pointPrelevement, {
    fallback,
    preferUsageName
  })

  if (pointName) {
    return pointName
  }

  return fallback
}

export function normalizePointId(pointId) {
  if (pointId === null || pointId === undefined || pointId === '') {
    return null
  }

  // Always return a string (or null)
  return String(pointId)
}
