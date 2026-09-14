import {isAuthGuardPublicPath} from './public-paths.js'

const HUMAN_ROLES = new Set(['ADMIN', 'INSTRUCTOR', 'DECLARANT'])
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit'
})

export function getActivityActorId(user) {
  const actor = user?.impersonation?.active ? user.impersonation.actor : user

  if (!actor?.id || actor.id === 'anonymous' || !HUMAN_ROLES.has(actor.role)) {
    return null
  }

  return actor.id
}

export function getActivityMonth(date) {
  const parts = MONTH_FORMATTER.formatToParts(date)
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`
}

export function shouldTrackUserActivity({actorId, pathname}) {
  return Boolean(actorId && pathname && !isAuthGuardPublicPath(pathname))
}

export async function sendUserActivity({fetchImpl = fetch} = {}) {
  const response = await fetchImpl('/auth/activity', {
    method: 'POST',
    headers: {'X-Activity-Signal': '1'},
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(6000)
  })

  return {success: response.ok, data: await response.json()}
}

/**
 * Browser-memory deduplication only. The API, not the browser clock or identity,
 * determines the recorded user and month. No request is made without an event.
 */
export function createUserActivityTracker({
  sendActivity,
  now = () => new Date(),
  retryDelayMs = 60_000
}) {
  const states = new Map()

  function report(actorId) {
    if (!actorId) {
      return Promise.resolve(false)
    }

    const date = now()
    const month = getActivityMonth(date)
    const key = `${actorId}:${month}`

    for (const [previousKey, state] of states) {
      if (state.month !== month && !state.pending) {
        states.delete(previousKey)
      }
    }

    let state = states.get(key)
    if (!state) {
      state = {month, completed: false, pending: null, retryAt: 0}
      states.set(key, state)
    }

    if (state.completed || date.getTime() < state.retryAt) {
      return Promise.resolve(state.completed)
    }

    if (state.pending) {
      return state.pending
    }

    state.pending = Promise.resolve()
      .then(() => sendActivity())
      .then(result => {
        state.completed = result?.success === true && result.data?.month === month
        return state.completed
      })
      .catch(() => false)
      .then(completed => {
        state.pending = null
        if (!completed) {
          state.retryAt = now().getTime() + retryDelayMs
        }

        return completed
      })

    return state.pending
  }

  return {report}
}

export function observeUserActivity({
  tracker,
  actorId,
  documentTarget,
  windowTarget
}) {
  const reportVisibleActivity = () => {
    if (documentTarget.visibilityState === 'visible') {
      void tracker.report(actorId)
    }
  }
  const reportInteraction = event => {
    if (event.isTrusted) {
      reportVisibleActivity()
    }
  }
  const interactionEvents = ['pointerdown', 'keydown', 'wheel']
  const interactionOptions = {passive: true}

  documentTarget.addEventListener('visibilitychange', reportVisibleActivity)
  windowTarget.addEventListener('focus', reportVisibleActivity)
  for (const eventName of interactionEvents) {
    documentTarget.addEventListener(eventName, reportInteraction, interactionOptions)
  }

  reportVisibleActivity()

  return () => {
    documentTarget.removeEventListener('visibilitychange', reportVisibleActivity)
    windowTarget.removeEventListener('focus', reportVisibleActivity)
    for (const eventName of interactionEvents) {
      documentTarget.removeEventListener(eventName, reportInteraction, interactionOptions)
    }
  }
}
