import {
  buildDashboardMapSearch,
  buildDashboardTerritorySearch,
  buildDashboardWaterResourceSearch
} from './dashboard-api.js'

// Only pending reads are shared. Settled responses are never cached, and an
// aborted consumer cannot cancel a read still needed by another component.
export function createDashboardClient({fetchImpl = fetch, concurrency = 4, maxQueued = 32} = {}) {
  const pending = new Map()
  const queue = []
  let active = 0

  const abortError = () => new DOMException('Lecture annulée', 'AbortError')

  async function fetchJSON(url, signal) {
    const response = await fetchImpl(url, {credentials: 'same-origin', cache: 'no-store', signal})
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      if (response.ok) throw new Error('Réponse du tableau de bord invalide')
    }
    signal.throwIfAborted()
    if (!response.ok) {
      const message = response.status === 401 ? 'Votre session a expiré. Reconnectez-vous pour charger les données.'
        : response.status === 403 ? 'Vous ne pouvez pas consulter les données de ce périmètre.'
          : data?.message || 'Impossible de charger le tableau de bord.'
      throw Object.assign(new Error(message), {code: response.status})
    }
    return data
  }

  function drain() {
    while (active < concurrency && queue.length > 0) {
      const entry = queue.shift()
      if (entry.controller.signal.aborted) continue
      active += 1
      entry.started = true
      fetchJSON(entry.url, entry.controller.signal).then(
        data => settle(entry, null, data),
        error => settle(entry, error)
      ).finally(() => {
        active -= 1
        drain()
      })
    }
  }

  function settle(entry, error, data) {
    if (pending.get(entry.url) === entry) pending.delete(entry.url)
    for (const subscriber of entry.subscribers) {
      subscriber.cleanup()
      if (error) subscriber.reject(error)
      else subscriber.resolve(data)
    }
    entry.subscribers.clear()
  }

  return (path, {signal} = {}) => {
    if (signal?.aborted) return Promise.reject(signal.reason ?? abortError())
    const url = `/api/dashboard/${path}`
    let entry = pending.get(url)
    if (!entry) {
      if (queue.length >= maxQueued) return Promise.reject(new Error('Trop de lectures en attente. Réessayez dans un instant.'))
      entry = {url, controller: new AbortController(), subscribers: new Set(), started: false}
      pending.set(url, entry)
      queue.push(entry)
    }
    const current = entry
    const promise = new Promise((resolve, reject) => {
      const subscriber = {resolve, reject, cleanup: () => signal?.removeEventListener('abort', abort)}
      const abort = () => {
        subscriber.cleanup()
        current.subscribers.delete(subscriber)
        reject(signal.reason ?? abortError())
        if (current.subscribers.size === 0) {
          if (pending.get(url) === current) pending.delete(url)
          current.controller.abort()
          if (!current.started) {
            const index = queue.indexOf(current)
            if (index !== -1) queue.splice(index, 1)
          }
        }
      }
      current.subscribers.add(subscriber)
      signal?.addEventListener('abort', abort, {once: true})
    })
    drain()
    return promise
  }
}

const readDashboard = createDashboardClient()

export const loadDashboardTerritory = (options, request) => readDashboard(`territory${buildDashboardTerritorySearch(options)}`, request)
export const loadDashboardMap = (options, request) => readDashboard(`map${buildDashboardMapSearch(options)}`, request)
export const loadDashboardPiezometry = (options, request) => readDashboard(`water-resources/piezometry${buildDashboardWaterResourceSearch(options)}`, request)
export const loadDashboardRiverFlows = (options, request) => readDashboard(`water-resources/flows${buildDashboardWaterResourceSearch(options)}`, request)
export const loadDashboardPointActors = (pointId, request) => readDashboard(`map/points/${encodeURIComponent(pointId)}/actors`, request)
