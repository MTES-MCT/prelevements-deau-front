/**
 * Normalize a HH:mm time string (supports "HH:MM" or "HH:MM:SS").
 * Returns null when the input cannot be interpreted.
 */
export const normalizeTime = time => {
  if (typeof time !== 'string') {
    return null
  }

  const trimmed = time.trim()
  if (!trimmed) {
    return null
  }

  const [hours = '00', minutes = '00'] = trimmed.split(':')
  const hasOnlyDigits = value => /^\d+$/.test(value)
  const pad = value => value.toString().padStart(2, '0')

  if (!hasOnlyDigits(hours) || !hasOnlyDigits(minutes)) {
    return null
  }

  // Validate hours and minutes
  const hoursNum = Number(hours)
  const minutesNum = Number(minutes)
  if (
    !Number.isInteger(hoursNum)
    || !Number.isInteger(minutesNum)
    || hoursNum < 0
    || hoursNum > 23
    || minutesNum < 0
    || minutesNum > 59
  ) {
    return null
  }

  return `${pad(hoursNum)}:${pad(minutesNum)}`
}
