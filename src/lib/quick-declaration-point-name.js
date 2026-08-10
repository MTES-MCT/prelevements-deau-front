import {
  getPointPrelevementDisplayName,
  getPointPrelevementName,
  MAX_POINT_USAGE_NAME_LENGTH as POINT_USAGE_NAME_MAX_LENGTH,
  normalizePointUsageName as normalizeUsageName
} from '../utils/point-prelevement.js'

export const MAX_POINT_USAGE_NAME_LENGTH = POINT_USAGE_NAME_MAX_LENGTH

export function getQuickDeclarationPointId(point) {
  return point?.pointPrelevementId || point?.id || null
}

export function normalizePointUsageName(value) {
  return normalizeUsageName(value)
}

export function getPointTechnicalName(point) {
  return getPointPrelevementName(point) || 'Point de prélèvement'
}

export function getPointUsageNameDraft(point, row) {
  if (row && Object.hasOwn(row, 'usageName')) {
    return row.usageName ?? ''
  }

  return point?.usageName ?? ''
}

export function getPointDisplayName(point, usageName = point?.usageName) {
  return getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName: true,
    usageName
  })
}

export function replacePointUsageName(points = [], pointId, usageName) {
  const normalizedUsageName = normalizePointUsageName(usageName) || null

  return points.map(point => getQuickDeclarationPointId(point) === pointId
    ? {...point, usageName: normalizedUsageName}
    : point)
}

export function buildPointDisplayNames(points = [], rows = {}) {
  return Object.fromEntries(points.flatMap(point => {
    const pointId = getQuickDeclarationPointId(point)

    if (!pointId) {
      return []
    }

    return [[
      pointId,
      getPointDisplayName(point, getPointUsageNameDraft(point, rows[pointId]))
    ]]
  }))
}
