export const FALLBACK_UNIT_LABEL = 'Sans unité'

export function normalizeUnitLabel(unit) {
  if (typeof unit === 'string' && unit.trim()) {
    return unit.trim()
  }

  return FALLBACK_UNIT_LABEL
}

const VALUE_TYPE_LABELS = new Map([
  ['instantaneous', 'instantané'],
  ['average', 'moyenne'],
  ['minimum', 'minimum'],
  ['maximum', 'maximum'],
  ['median', 'médiane'],
  ['delta-index', 'delta-index'],
  ['cumulative', 'cumulé'],
  ['raw', 'brut']
])

export function normalizeValueType(valueType) {
  if (valueType === null || valueType === undefined) {
    return null
  }

  const trimmed = valueType.toString().trim()
  if (!trimmed) {
    return null
  }

  return trimmed.toLowerCase()
}

export function formatValueTypeLabel(valueType) {
  const normalized = normalizeValueType(valueType)
  if (!normalized) {
    return null
  }

  const label = VALUE_TYPE_LABELS.get(normalized)
  return label ?? VALUE_TYPE_LABELS.get('raw')
}

export function isCumulativeValueType(valueType) {
  return normalizeValueType(valueType) === 'cumulative'
}

export function resolveKnownValueType(valueType) {
  const normalized = normalizeValueType(valueType)
  if (!normalized) {
    return null
  }

  return VALUE_TYPE_LABELS.has(normalized) ? normalized : null
}
