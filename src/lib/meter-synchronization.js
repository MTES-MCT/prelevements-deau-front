export function getMeterSynchronizationStatus(allocation) {
  if (allocation.sync?.available === false) {
    return {status: 'Non connecté', note: 'Sans synchronisation automatique.'}
  }

  if (allocation.status === 'INCOMPLETE') {
    return {status: 'À valider', severity: 'warning', note: 'Rattachement à valider — aucun volume attribué.'}
  }

  if (allocation.status === 'DISABLED' || allocation.sync?.state === 'DISABLED') {
    return {status: 'En pause', severity: 'info'}
  }

  if (allocation.sync?.state === 'ERROR') {
    return {status: 'Dernière synchronisation en échec', severity: 'error'}
  }

  return allocation.sync?.state === 'SUCCESS'
    ? {status: 'Synchronisation active', severity: 'success'}
    : {status: 'En attente', severity: 'info'}
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
