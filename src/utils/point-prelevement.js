export function getPointPrelevementName(pointPrelevement) {
  if (!pointPrelevement) {
    return ''
  }

  return pointPrelevement.name
    || pointPrelevement.autresNoms
    || ''
}

export function getPointPrelevementLabel({pointPrelevement, fallback = 'Point de prélèvement'}) {
  const pointName = getPointPrelevementName(pointPrelevement)

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
