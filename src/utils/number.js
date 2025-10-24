export function formatNumber(value, options = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return ''
  }

  return value.toLocaleString('fr-FR', {
    useGrouping: true,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    ...options
  })
}

/**
 * Convert input to a finite number when possible, otherwise null.
 * Accepts numbers or strings (including comma-separated decimals).
 */
export const coerceNumericValue = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  // Remove thousand separators and handle decimal comma
  const cleaned = normalized.replaceAll(/\s/g, '').replaceAll(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

