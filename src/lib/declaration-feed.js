export const DEFAULT_DECLARATION_FEED_LIMIT = 20

export function buildDeclarationFeedSearchParams({
  cursor,
  includeMeta = true,
  limit = DEFAULT_DECLARATION_FEED_LIMIT
} = {}) {
  const searchParameters = new URLSearchParams()

  if (cursor) {
    searchParameters.set('cursor', cursor)
  }

  if (!includeMeta) {
    searchParameters.set('includeMeta', 'false')
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
