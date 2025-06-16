export function formatNumber(value, options = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return ''
  }

  return value.toLocaleString('fr-FR', {
    useGrouping: true,
    ...options
  })
}
