export function getPointPrelevementLabel({idPoint, pointPrelevement, fallback = 'Point de prélèvement'}) {
  const pointName = pointPrelevement?.nom || pointPrelevement?.name || pointPrelevement?.label
  const hasPointId = idPoint !== null && idPoint !== undefined && idPoint !== ''

  if (pointName && hasPointId) {
    return `${idPoint} - ${pointName}`
  }

  if (pointName) {
    return pointName
  }

  if (hasPointId) {
    return `Point ${idPoint}`
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
