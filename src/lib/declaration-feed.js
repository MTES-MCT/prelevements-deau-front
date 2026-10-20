export const DEFAULT_DECLARATION_FEED_LIMIT = 25

export function buildDeclarationFeedSearchParams({
  cursor,
  includeMeta = true,
  includeCounts = true,
  kinds,
  declarationCode,
  declarantName,
  dateFrom,
  dateTo,
  pointsToAssociateOnly = false,
  limit = DEFAULT_DECLARATION_FEED_LIMIT
} = {}) {
  const searchParameters = new URLSearchParams()

  if (cursor) {
    searchParameters.set('cursor', cursor)
  }

  if (!includeMeta) {
    searchParameters.set('includeMeta', 'false')
  }

  if (!includeCounts) {
    searchParameters.set('includeCounts', 'false')
  }

  if (Array.isArray(kinds)) {
    searchParameters.set('kinds', kinds.join(','))
  }

  for (const [name, value] of Object.entries({declarationCode, declarantName, dateFrom, dateTo})) {
    if (typeof value === 'string' && value.trim()) {
      searchParameters.set(name, value.trim())
    }
  }

  if (pointsToAssociateOnly) {
    searchParameters.set('pointsToAssociateOnly', 'true')
  }

  if (limit) {
    searchParameters.set('limit', String(limit))
  }

  return searchParameters
}

export function mergeDeclarationFeedEntries(existingEntries = [], newEntries = []) {
  const mergedEntries = []
  const knownIds = new Set()

  for (const entry of [...existingEntries, ...newEntries]) {
    if (!entry?.id || knownIds.has(entry.id)) {
      continue
    }

    knownIds.add(entry.id)
    mergedEntries.push(entry)
  }

  return mergedEntries
}

export function normalizeDeclarationFeedPagination(pagination, fallbackLimit = DEFAULT_DECLARATION_FEED_LIMIT) {
  return {
    hasNext: pagination?.hasNext === true,
    limit: Number.isInteger(pagination?.limit) && pagination.limit > 0
      ? pagination.limit
      : fallbackLimit,
    nextCursor: pagination?.hasNext === true && typeof pagination.nextCursor === 'string'
      ? pagination.nextCursor
      : null
  }
}


export function hasOtherDeclarations(meta, entries = []) {
  if (typeof meta?.hasOtherDeclarations === 'boolean') {
    return meta.hasOtherDeclarations
  }

  return meta?.countsByKind?.NONE > 0 || entries.some(entry => entry.kind === 'NONE'
    || (!entry.kind && entry.declaration && [null, undefined, 'NONE'].includes(entry.declaration.dataSourceType)))
}

export function updateDeclarationFeedCursors(cursors, pageIndex, pagination) {
  const nextCursors = [...cursors]
  const nextIndex = pageIndex + 1
  if (!pagination.hasNext || !pagination.nextCursor) {
    return nextCursors.slice(0, nextIndex)
  }

  if (nextCursors[nextIndex] !== pagination.nextCursor) {
    nextCursors.splice(nextIndex, nextCursors.length, pagination.nextCursor)
  }

  return nextCursors
}
