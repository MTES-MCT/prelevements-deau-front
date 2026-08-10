export const POINT_ASSOCIATION_ORIGINS = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL'
})

export function getChunkPointAssociationOrigin(chunk) {
  if (!chunk?.pointPrelevementId) {
    return null
  }

  if (Object.values(POINT_ASSOCIATION_ORIGINS).includes(chunk.pointAssociationOrigin)) {
    return chunk.pointAssociationOrigin
  }

  const parsingInfo = chunk.parsingInfo && typeof chunk.parsingInfo === 'object'
    ? chunk.parsingInfo
    : {}
  const reason = typeof parsingInfo.reason === 'string' ? parsingInfo.reason : ''

  if (parsingInfo.reconciledAt || reason.startsWith('POINT_RECONCILED_BY_')) {
    return POINT_ASSOCIATION_ORIGINS.MANUAL
  }

  return POINT_ASSOCIATION_ORIGINS.AUTOMATIC
}

export function canChangeChunkPointAssociation(chunk) {
  return !chunk?.pointPrelevementId
    || getChunkPointAssociationOrigin(chunk) === POINT_ASSOCIATION_ORIGINS.MANUAL
}
