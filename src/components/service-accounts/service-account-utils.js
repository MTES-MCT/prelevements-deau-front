export function formatDate(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium'
  }).format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function getActionData(result) {
  if (!result?.success) {
    throw new Error(result?.error || 'Une erreur est survenue.')
  }

  return result.data
}

export function serviceAccountHref(serviceAccount, suffix = '') {
  const id = typeof serviceAccount === 'string' ? serviceAccount : serviceAccount.id
  return `/comptes-service/${id}${suffix}`
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

export function getServiceAccountStatusLabel(serviceAccount) {
  if (serviceAccount?.statusLabel) {
    return serviceAccount.statusLabel
  }

  if (serviceAccount?.deletedAt || serviceAccount?.isDeleted) {
    return 'Supprimé'
  }

  return serviceAccount?.isActive ? 'Actif' : 'Désactivé'
}
