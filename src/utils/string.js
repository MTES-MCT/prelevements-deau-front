import {deburr} from 'lodash-es'

export function normalizeString(string) {
  if (!string) {
    return string
  }

  return deburr(string.toLowerCase()).trim()
}

export function emptyStringToNull(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) =>
      [key, (value === '' || value === undefined) ? null : value]
    )
  )
}

