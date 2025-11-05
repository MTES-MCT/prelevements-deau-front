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

/**
 * Parses combined date and time strings into a Date in local time.
 * Time string is optional and defaults to 00:00 if omitted.
 * @param {string} dateString - YYYY-MM-DD
 * @param {string|null} [timeString] - HH:mm or HH:mm:ss
 * @returns {Date|null}
 */
export const parseLocalDateTime = (dateString, timeString) => {
  if (typeof dateString !== 'string') {
    return null
  }

  const trimmedDate = dateString.trim()
  if (!trimmedDate) {
    return null
  }

  const [yearStr, monthStr, dayStr] = trimmedDate.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (
    Number.isNaN(year)
    || Number.isNaN(month)
    || Number.isNaN(day)
  ) {
    return null
  }

  const baseDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  if (Number.isNaN(baseDate.getTime())) {
    return null
  }

  if (typeof timeString !== 'string' || timeString.trim() === '') {
    return baseDate
  }

  const [hoursStr, minutesStr = '0', secondsStr = '0'] = timeString.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const seconds = Number(secondsStr)

  const safeHours = Number.isNaN(hours) ? 0 : hours
  const safeMinutes = Number.isNaN(minutes) ? 0 : minutes
  const safeSeconds = Number.isNaN(seconds) ? 0 : seconds

  baseDate.setHours(safeHours, safeMinutes, safeSeconds, 0)
  return baseDate
}
