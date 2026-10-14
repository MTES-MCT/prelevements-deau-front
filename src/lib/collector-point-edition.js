import {normalizeCountingCode} from './exploitation-identity.js'

const textOrNull = value => String(value ?? '').trim() || null

export function buildCollectorPointEditionPayload(initial, {pointPatch = {}, exploitations = []}) {
  const fields = new Set(initial.point.right.editableFields)
  const point = Object.fromEntries(Object.entries(pointPatch)
    .filter(([key]) => fields.has(key))
    .map(([key, value]) => [key, typeof value === 'string' ? textOrNull(value) : value])
    .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial.point[key] ?? null)))
  const changes = exploitations.flatMap(exploitation => {
    const before = initial.exploitations.find(item => item.id === exploitation.id)
    if (!before) return []
    const change = {id: before.id}
    const countingCode = normalizeCountingCode(exploitation.countingCode)
    if (before.capabilities.canEditCountingCode && countingCode !== normalizeCountingCode(before.countingCode)) {
      change.countingCode = countingCode
      change.expectedCountingCode = normalizeCountingCode(before.countingCode)
    }
    const meters = (exploitation.meters ?? []).flatMap(meter => {
      const serialNumber = textOrNull(meter.serialNumber)
      if (!meter.id) return before.capabilities.canAddMeter && serialNumber ? [{serialNumber}] : []
      const existing = before.meters.find(item => item.id === meter.id)
      if (!existing?.capabilities.canEditSerialNumber || serialNumber === textOrNull(existing.serialNumber)) return []
      return [{id: existing.id, expectedUpdatedAt: existing.updatedAt, serialNumber}]
    })
    if (meters.length) change.meters = meters
    return Object.keys(change).length > 1 ? [change] : []
  })
  return {expectedUpdatedAt: initial.point.updatedAt, point, exploitations: changes}
}

export function collectorExploitationLabel(exploitation, index) {
  const owner = exploitation.preleveur
  const name = owner?.socialReason || [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Préleveur'
  return `Exploitation ${index + 1} — ${name}${exploitation.usage?.label ? ` — ${exploitation.usage.label}` : ''}`
}
