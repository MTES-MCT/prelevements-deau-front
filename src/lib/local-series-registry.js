/**
 * Factory to create an in-memory registry for locally validated series.
 * The registry instance is meant to live alongside a component tree
 * so it can be scoped per page instead of sharing a global map.
 */
export function createLocalSeriesRegistry() {
  const registry = new Map()

  const deepCloneEntry = value => {
    if (!value || typeof value !== 'object') {
      return value
    }

    if (Array.isArray(value.values)) {
      return {
        ...value,
        values: value.values.map(item => (
          item && typeof item === 'object'
            ? {...item}
            : item
        ))
      }
    }

    return {...value}
  }

  /**
   * Register or replace local series values for later retrieval.
   * @param {Array<{id: string, values: Array}>} entries
   */
  const register = entries => {
    if (!Array.isArray(entries)) {
      return
    }

    for (const entry of entries) {
      if (!entry?.id) {
        continue
      }

      // Clone on registration to isolate the registry from caller-side mutations.
      const safeValues = Array.isArray(entry.values)
        ? entry.values.map(item => deepCloneEntry(item))
        : []

      registry.set(entry.id, {
        values: safeValues
      })
    }
  }

  /**
   * Retrieve registered series values if available, applying optional filters.
   * @param {string} seriesId
   * @param {{start?: string, end?: string}} [options]
   * @returns {{values: Array}|null}
   */
  const get = (seriesId, {start, end} = {}) => {
    if (!seriesId || !registry.has(seriesId)) {
      return null
    }

    const {values} = registry.get(seriesId)
    const filtered = values.filter(entry => {
      if (!entry?.date) {
        return false
      }

      if (start && entry.date < start) {
        return false
      }

      if (end && entry.date > end) {
        return false
      }

      return true
    }).map(item => deepCloneEntry(item))

    // Clone again so consumers cannot mutate the stored registry state through the returned reference.

    return {values: filtered}
  }

  /**
   * Clear the registry. When a prefix is provided only entries matching it are removed.
   * @param {string} [prefix]
   */
  const clear = prefix => {
    if (!prefix) {
      registry.clear()
      return
    }

    for (const key of registry.keys()) {
      if (key.startsWith(prefix)) {
        registry.delete(key)
      }
    }
  }

  return {
    register,
    get,
    clear
  }
}
