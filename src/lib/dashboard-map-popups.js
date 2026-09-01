export const DEFAULT_DASHBOARD_MAP_CAPABILITIES = Object.freeze({
  readPointActors: false,
  readPointDetails: false
})

export function normalizeDashboardMapCapabilities(capabilities) {
  return {
    readPointActors: capabilities?.readPointActors === true,
    readPointDetails: capabilities?.readPointDetails === true
  }
}

export function canLoadDashboardPointActors(capabilities, {showPreleveurs = true} = {}) {
  return showPreleveurs && capabilities?.readPointActors === true
}

export function indexDashboardMapItems(items = []) {
  const itemsById = new Map()

  for (const item of items) {
    if (item?.id !== null && item?.id !== undefined) {
      itemsById.set(String(item.id), item)
    }
  }

  return itemsById
}

function normalizeActors(actors) {
  if (!Array.isArray(actors)) {
    return []
  }

  return actors
    .filter(actor => actor?.id !== null && actor?.id !== undefined)
    .map(actor => ({
      id: actor.id,
      label: typeof actor.label === 'string' && actor.label.trim()
        ? actor.label.trim()
        : 'Non renseigné'
    }))
}

export function normalizeDashboardPointActors(payload) {
  return {
    pointId: payload?.pointId ?? null,
    preleveurs: normalizeActors(payload?.preleveurs),
    collecteurs: normalizeActors(payload?.collecteurs)
  }
}

export function getResolvedCachedValue(cache, key) {
  const cached = cache.get(String(key))
  return cached && typeof cached.then !== 'function' ? cached : null
}

export function loadCachedValue(cache, key, loader) {
  const cacheKey = String(key)
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const request = (async () => {
    try {
      const value = await loader()
      cache.set(cacheKey, value)
      return value
    } catch (error) {
      cache.delete(cacheKey)
      throw error
    }
  })()

  cache.set(cacheKey, request)
  return request
}
