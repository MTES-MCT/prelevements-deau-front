export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

export function getInstructorName(instructor) {
  const fullName = [instructor?.firstName, instructor?.lastName].filter(Boolean).join(' ').trim()

  return fullName || instructor?.email || 'Agent sans nom'
}

export function formatDate(date) {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR').format(new Date(date))
}

export function formatAccessPeriod(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'Accès permanent'
  }

  if (!startDate) {
    return `Jusqu’au ${formatDate(endDate)}`
  }

  if (!endDate) {
    const start = new Date(startDate)
    const now = new Date()

    return start > now
      ? `À partir du ${formatDate(startDate)}`
      : `Depuis le ${formatDate(startDate)}`
  }

  return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
}

export function getZoneLabel(zone) {
  return [zone?.name, zone?.code ? `(${zone.code})` : null].filter(Boolean).join(' ') || 'Zone sans nom'
}

export function getHabilitationStatusLabel(status) {
  if (status === 'FUTURE') {
    return 'À venir'
  }

  if (status === 'ENDED') {
    return 'Terminée'
  }

  return 'Active'
}

export function getHabilitationStatusSeverity(status) {
  if (status === 'FUTURE') {
    return 'info'
  }

  if (status === 'ENDED') {
    return 'warning'
  }

  return 'success'
}

export function getHabilitationRoleLabel(habilitation) {
  if (habilitation?.isAdmin) {
    return 'Accès complet'
  }

  const count = habilitation?.permissions?.length || 0
  return count === 0
    ? 'Aucun droit attribué'
    : pluralize(count, 'droit attribué', 'droits attribués')
}
