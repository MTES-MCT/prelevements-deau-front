export function percentageToUnits(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,4})?$/.test(text)) return null
  const [integer, fraction = ''] = text.split('.')
  const units = Number(integer) * 10_000 + Number(fraction.padEnd(4, '0'))
  return units <= 1_000_000 ? units : null
}

export function getAllocationTotal(allocations) {
  const values = allocations.map(allocation => percentageToUnits(allocation.percentage))
  return values.some(value => value === null) ? null : values.reduce((sum, value) => sum + value, 0)
}

export function buildAllocationUpdate(settings, {allocations, effectiveDate, reason}) {
  if (getAllocationTotal(allocations) !== 1_000_000) throw new Error('La répartition doit totaliser exactement 100 %.')
  const date = new Date(`${effectiveDate}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== effectiveDate || effectiveDate < settings.minEffectiveDate || effectiveDate < '1900-01-01' || effectiveDate > '2100-12-31') throw new Error('Choisissez une date d’effet autorisée.')
  if (reason.trim().length < 3 || reason.trim().length > 500) throw new Error('Indiquez un motif de 3 à 500 caractères.')
  if (allocations.some(allocation => (allocation.unresolved || allocation.inScope) && allocation.exploitationId === null)) throw new Error('Renseignez chaque exploitation manquante ou choisissez explicitement une part hors plateforme.')
  if (allocations.some(allocation => allocation.exploitationId !== null && !allocation.exploitationId)) throw new Error('Choisissez une exploitation ou une part hors plateforme.')
  if (!allocations.some(allocation => allocation.exploitationId)) throw new Error('Au moins une exploitation doit rester rattachée au compteur.')
  return {
    streamId: settings.stream.id,
    expectedVersion: settings.expectedVersion,
    effectiveDate,
    reason: reason.trim(),
    allocations: allocations.map(allocation => ({
      ...(allocation.key ? {key: allocation.key} : {}),
      exploitationId: allocation.exploitationId,
      percentage: String(allocation.percentage).trim().replace(',', '.'),
      additive: allocation.additive === true
    }))
  }
}

export function getDefaultAllocationDate(minEffectiveDate, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now)
  return today > minEffectiveDate ? today : minEffectiveDate
}
