export const POINT_FLOW_TYPES = Object.freeze({
  PRELEVEMENT: 'PRELEVEMENT',
  REJET: 'REJET'
})

export const pointFlowTypeLabels = Object.freeze({
  [POINT_FLOW_TYPES.PRELEVEMENT]: 'Prélèvement',
  [POINT_FLOW_TYPES.REJET]: 'Rejet'
})

export const pointFlowTypeColors = Object.freeze({
  [POINT_FLOW_TYPES.PRELEVEMENT]: Object.freeze({
    accentColor: 'var(--app-color-blue-france, #000091)',
    backgroundColor: 'var(--app-flow-prelevement-background, #E3E3FD)',
    borderColor: 'var(--app-flow-prelevement-border, #CACAFB)',
    textColor: 'var(--app-color-blue-france, #000091)'
  }),
  [POINT_FLOW_TYPES.REJET]: Object.freeze({
    accentColor: 'var(--app-flow-rejet-border, #CE614A)',
    backgroundColor: 'var(--app-flow-rejet-background, #FEE9E7)',
    borderColor: 'var(--app-flow-rejet-border, #CE614A)',
    textColor: 'var(--app-flow-rejet-text, #B34000)'
  })
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

export function getPointFlowTypeColors(pointOrFlowType) {
  const flowType = typeof pointOrFlowType === 'string'
    ? pointOrFlowType
    : getPointFlowType(pointOrFlowType)

  return pointFlowTypeColors[flowType] ?? pointFlowTypeColors[POINT_FLOW_TYPES.PRELEVEMENT]
}

export function getPointFlowChangeDetails(response) {
  const details = response?.data?.data ?? response?.data

  return response?.code === 409 && details?.reason === 'FLOW_RECLASSIFICATION_CONFIRMATION_REQUIRED'
    ? details
    : null
}
