export function normalizeString(string) {
  if (!string) {
    return ''
  }

  return string
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/['\u2019]/g, '') // Remove both straight (') and curly (') apostrophes
    .replaceAll(/\s+/g, ' ')
}

export function emptyStringToNull(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) =>
      [key, (value === '' || value === undefined) ? null : value]
    )
  )
}
