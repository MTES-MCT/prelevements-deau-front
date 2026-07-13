export const POINT_FLOW_TYPES = Object.freeze({
  PRELEVEMENT: 'PRELEVEMENT',
  REJET: 'REJET'
})

export const pointFlowTypeLabels = Object.freeze({
  [POINT_FLOW_TYPES.PRELEVEMENT]: 'Prélèvement',
  [POINT_FLOW_TYPES.REJET]: 'Rejet'
})

export function getPointFlowType(point) {
  return point?.flowType ?? POINT_FLOW_TYPES.PRELEVEMENT
}

export function getPointFlowTypeLabel(pointOrFlowType) {
  const flowType = typeof pointOrFlowType === 'string'
    ? pointOrFlowType
    : getPointFlowType(pointOrFlowType)

  return pointFlowTypeLabels[flowType] ?? flowType
}

export function getPointFlowChangeDetails(response) {
  const details = response?.data?.data ?? response?.data

  return response?.code === 409 && details?.reason === 'FLOW_RECLASSIFICATION_CONFIRMATION_REQUIRED'
    ? details
    : null
}
