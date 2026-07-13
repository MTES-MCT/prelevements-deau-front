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

export function buildPointUsageNameChanges(points = [], rows = {}) {
  return points.flatMap(point => {
    const pointPrelevementId = getQuickDeclarationPointId(point)

    if (!pointPrelevementId) {
      return []
    }

    const currentUsageName = normalizePointUsageName(point.usageName)
    const nextUsageName = normalizePointUsageName(getPointUsageNameDraft(point, rows[pointPrelevementId]))

    if (currentUsageName === nextUsageName) {
      return []
    }

    return [{
      pointPrelevementId,
      usageName: nextUsageName || null
    }]
  })
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
