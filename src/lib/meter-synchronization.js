const syncLabels = {
  DISABLED: 'Synchronisation en pause',
  PENDING: 'Première synchronisation en attente',
  SUCCESS: 'Synchronisation active',
  ERROR: 'Dernière synchronisation en échec'
}

export function getMeterSynchronizationLabel(allocation) {
  if (allocation.sync?.available === false) {
    return 'Compteur référencé — sans synchronisation automatique'
  }

  if (allocation.status === 'INCOMPLETE') {
    return 'Affectation à valider — aucun volume attribué'
  }

  if (allocation.status === 'DISABLED') {
    return 'Affectation inactive'
  }

  return syncLabels[allocation.sync?.state] ?? 'Synchronisation en attente'
}

export function formatMeterPercentage(value) {
  if (value === null || value === undefined || value === '') {
    return 'À valider'
  }

  const percentage = Number(value)
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
    ? `${percentage.toLocaleString('fr-FR', {maximumFractionDigits: 4})} %`
    : 'À valider'
}

export function formatMeterDate(value, {withTime = false} = {}) {
  if (!value || !Number.isFinite(new Date(value).getTime())) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', dateStyle: 'short', ...(withTime ? {timeStyle: 'medium'} : {})
  }).format(new Date(value))
}

export function getMeterQualityLabel(quality) {
  return typeof quality === 'string' && quality.trim() ? quality : 'Qualité non renseignée'
}

export function formatMeterIndex(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value).toLocaleString('fr-FR', {maximumFractionDigits: 4}) : 'Non renseigné'
}

export function canReadGlobalMeterReadings(allocation, isAdmin) {
  return isAdmin === true && allocation.capabilities?.canReadGlobalReadings === true
}

export function mergeMeterReadings(current, incoming) {
  return [...new Map([...current, ...incoming].map(reading => [reading.id, reading])).values()]
}
