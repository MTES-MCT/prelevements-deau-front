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
 * Normalize a date parameter. Accepts string or Date.
 * @param {string|Date|undefined|null} date
 * @returns {string|undefined}
 */
export function normalizeDate(date) {
  if (date === undefined || date === null || date === '') {
    return undefined
  }

  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return String(date)
}

/**
 * Parses combined date and time strings into a Date in local time.
 * Time string is optional and defaults to 00:00 if omitted.
 * @param {string} dateString - YYYY-MM-DD
 * @param {string|null} [timeString] - HH:mm or HH:mm:ss
 * @returns {Date|null}
 */
const DATE_TIME_SEPARATORS = Object.freeze(['T', ' '])

const splitDateTime = value => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  for (const separator of DATE_TIME_SEPARATORS) {
    const separatorIndex = trimmed.indexOf(separator)
    if (separatorIndex > 0) {
      return {
        datePart: trimmed.slice(0, separatorIndex),
        inferredTime: trimmed.slice(separatorIndex + 1)
      }
    }
  }

  return {datePart: trimmed, inferredTime: null}
}

const parseDateComponents = datePart => {
  const match = datePart.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const hasMonth = match[2] !== undefined
  const hasDay = match[3] !== undefined
  const month = hasMonth ? Number(match[2]) : 1
  const day = hasDay ? Number(match[3]) : 1

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || month < 1
    || month > 12
  ) {
    return null
  }

  return {year, month, day}
}

const createBaseDate = ({year, month, day}) => {
  const baseDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  if (Number.isNaN(baseDate.getTime())) {
    return null
  }

  if (baseDate.getFullYear() !== year || baseDate.getMonth() + 1 !== month) {
    return null
  }

  return baseDate
}

const resolveTimeComponent = (explicitTime, inferredTime) => {
  const explicit = typeof explicitTime === 'string' ? explicitTime.trim() : ''
  const fallback = typeof inferredTime === 'string' ? inferredTime.trim() : ''
  const candidate = explicit || fallback

  if (!candidate) {
    return null
  }

  const normalized = candidate
    .replace(/z$/i, '')
    .replace(/\.\d+$/, '')

  const match = normalized.match(/^(\d{1,2}(?::\d{2}){1,2})/)
  return match ? match[1] : null
}

const applyTimeComponent = (baseDate, timeValue) => {
  if (!timeValue) {
    return baseDate
  }

  const [hoursStr, minutesStr = '0', secondsStr = '0'] = timeValue.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const seconds = Number(secondsStr)

  if (
    Number.isNaN(hours)
    || Number.isNaN(minutes)
    || Number.isNaN(seconds)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
  ) {
    return null
  }

  baseDate.setHours(hours, minutes, seconds, 0)
  return baseDate
}

export const parseLocalDateTime = (dateString, timeString) => {
  const splitResult = splitDateTime(dateString)
  if (!splitResult) {
    return null
  }

  const components = parseDateComponents(splitResult.datePart)
  if (!components) {
    return null
  }

  const baseDate = createBaseDate(components)
  if (!baseDate) {
    return null
  }

  const resolvedTime = resolveTimeComponent(timeString, splitResult.inferredTime)
  if (!resolvedTime) {
    return baseDate
  }

  return applyTimeComponent(baseDate, resolvedTime)
}
