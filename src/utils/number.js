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

// Group a decimal integer without converting it to Number (large indexes must
// retain every digit) or using a quadratic look-ahead regular expression.
export function groupIntegerDigits(value, separator = ' ') {
  const digits = String(value)
  const groups = [digits.slice(0, digits.length % 3 || 3)]
  for (let index = groups[0].length; index < digits.length; index += 3) {
    groups.push(digits.slice(index, index + 3))
  }

  return groups.join(separator)
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
