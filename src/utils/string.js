import {deburr} from 'lodash-es'

export function normalizeString(string) {
  if (!string) {
    return string
  }

  return deburr(string.toLowerCase())
}

export function normalizeName(string) {
  if (!string) {
    return string
  }

  return string.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function emptyStringToNull(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) =>
      [key, (value === '' || value === undefined) ? null : value]
    )
  )
}

/**
 * Capitalise la première lettre d'une chaîne
 * @param {string} value - La chaîne à capitaliser
 * @returns {string} La chaîne capitalisée
 */
export const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1)
