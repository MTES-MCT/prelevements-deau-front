// Temporary, tab-scoped safety net for App Router traversals. It is not a
// submission and never grants access: the fresh server context gates recovery.
const prefix = 'campaign-response-recovery:'
const memory = new Map()
const departures = new Map()
let epoch = 0

export const campaignRecoveryEpoch = () => epoch

export const campaignRecoveryKey = ({userId, campaignId, preleveurUserId, kind}) => userId && userId !== 'anonymous'
  ? `${prefix}${JSON.stringify([userId, campaignId, preleveurUserId, kind])}` : null

export function readCampaignRecovery(key, storage) {
  if (!key) {
    return null
  }

  try {
    const value = memory.get(key) || JSON.parse(storage?.getItem(key) || 'null')
    return value && Date.now() - value.updatedAt < 86_400_000 ? structuredClone(value) : null
  } catch {
    return null
  }
}

export function writeCampaignRecovery(key, value, storage) {
  if (!key) {
    return
  }

  const snapshot = {...structuredClone(value), updatedAt: Date.now()}
  memory.set(key, snapshot)
  try {
    storage?.setItem(key, JSON.stringify(snapshot))
  } catch {
    // A full/disabled sessionStorage must never interrupt ordinary draft saves.
  }
}

export function removeCampaignRecovery(key, storage) {
  memory.delete(key)
  try {
    storage?.removeItem(key)
  } catch {
    // The in-memory fallback remains usable when storage is unavailable.
  }
}

export function clearCampaignRecoveries(storage) {
  epoch++
  memory.clear()
  departures.clear()
  try {
    for (const key of Object.keys(storage || {})) {
      if (key.startsWith(prefix)) {
        storage.removeItem(key)
      }
    }
  } catch {
    // Logging out must work even if browser storage is disabled.
  }
}

export function trackCampaignDeparture(key, promise) {
  const settled = (async () => {
    try {
      await promise
    } catch {
      // The draft remains available for an explicit retry on return.
    } finally {
      if (departures.get(key) === settled) {
        departures.delete(key)
      }
    }
  })()
  if (key) {
    departures.set(key, settled)
  }
}

export const waitCampaignDeparture = key => departures.get(key) || Promise.resolve()
export const hasCampaignDeparture = key => departures.has(key)
