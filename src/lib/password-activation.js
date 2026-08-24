export const PASSWORD_ACTIVATION_STORAGE_KEY = 'ple.password-activation'

export function takePasswordActivationValue(storage) {
  if (!storage) {
    return null
  }

  let value = null

  try {
    value = storage.getItem(PASSWORD_ACTIVATION_STORAGE_KEY)
  } catch {
    return null
  } finally {
    try {
      storage.removeItem(PASSWORD_ACTIVATION_STORAGE_KEY)
    } catch {
      // Storage may be disabled; URL scrubbing remains the priority.
    }
  }

  return value || null
}

export function takePasswordActivationValueOnce(storage, readState) {
  if (!readState || readState.current) {
    return undefined
  }

  readState.current = true
  return takePasswordActivationValue(storage)
}
