export const EMAIL_VERIFICATION_STORAGE_KEY = 'ple.email-verification'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const EMAIL_VERIFICATION_PURPOSES = Object.freeze({
  primary: 'PRIMARY_CHANGE',
  alias: 'ALIAS_ADD'
})

const STATUS_PRESENTATIONS = Object.freeze({
  PENDING: {
    label: 'Validation en attente',
    badgeClassName: 'fr-badge--info',
    description: 'Un lien de validation a été envoyé à cette adresse.'
  },
  SEND_FAILED: {
    label: 'Envoi à relancer',
    badgeClassName: 'fr-badge--error',
    description: 'Le message de validation n’a pas pu être envoyé. Vous pouvez réessayer.'
  },
  EXPIRED: {
    label: 'Lien expiré',
    badgeClassName: 'fr-badge--warning',
    description: 'Le lien n’est plus valable. Renvoyez un message pour poursuivre.'
  },
  VERIFIED: {
    label: 'Adresse validée',
    badgeClassName: 'fr-badge--success',
    description: 'Cette adresse a été validée.'
  },
  CANCELLED: {
    label: 'Demande annulée',
    badgeClassName: '',
    description: 'Cette demande a été annulée.'
  },
  SUPERSEDED: {
    label: 'Demande remplacée',
    badgeClassName: '',
    description: 'Une demande plus récente remplace celle-ci.'
  },
  CONFLICT: {
    label: 'Adresse indisponible',
    badgeClassName: 'fr-badge--error',
    description: 'Cette adresse est déjà utilisée par un autre compte.'
  }
})

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function shouldDisplayEmailVerification(verification) {
  return ['PENDING', 'SEND_FAILED', 'EXPIRED', 'CONFLICT']
    .includes(verification?.status)
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(normalizeEmail(value))
}

export function takeEmailVerificationValue(storage) {
  if (!storage) {
    return null
  }

  let value = null

  try {
    value = storage.getItem(EMAIL_VERIFICATION_STORAGE_KEY)
  } catch {
    return null
  } finally {
    try {
      storage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY)
    } catch {
      // Le fragment a déjà été retiré de l’URL : ne jamais le restaurer.
    }
  }

  return value || null
}

export function takeEmailVerificationValueOnce(storage, readState) {
  if (!readState || readState.current) {
    return undefined
  }

  readState.current = true
  return takeEmailVerificationValue(storage)
}

export function extractEmailVerification(data) {
  if (!data) {
    return null
  }

  return data.emailVerification ?? data.verification ?? (
    data.id && data.purpose ? data : null
  )
}

export function getEffectiveVerificationStatus(verification, now = Date.now()) {
  if (
    ['PENDING', 'SEND_FAILED'].includes(verification?.status)
    && verification.expiresAt
    && new Date(verification.expiresAt).getTime() <= now
  ) {
    return 'EXPIRED'
  }

  return verification?.status || 'PENDING'
}

export function getVerificationPresentation(verification, now = Date.now()) {
  const status = getEffectiveVerificationStatus(verification, now)

  return STATUS_PRESENTATIONS[status] ?? {
    label: 'Statut indisponible',
    badgeClassName: '',
    description: 'Le statut de cette demande ne peut pas être affiché.'
  }
}

export function canResendVerification(verification, now = Date.now()) {
  return ['PENDING', 'SEND_FAILED', 'EXPIRED']
    .includes(getEffectiveVerificationStatus(verification, now))
}

export function canCancelVerification(verification, now = Date.now()) {
  return ['PENDING', 'SEND_FAILED']
    .includes(getEffectiveVerificationStatus(verification, now))
}

export function getResendDelaySeconds(verification, now = Date.now()) {
  const status = getEffectiveVerificationStatus(verification, now)

  if (!verification || !['PENDING', 'SEND_FAILED'].includes(status)) {
    return 0
  }

  const nextResendAt = verification.nextResendAt
    ? new Date(verification.nextResendAt).getTime()
    : new Date(verification.sentAt ?? verification.createdAt).getTime() + 60_000

  if (!Number.isFinite(nextResendAt)) {
    return 0
  }

  return Math.max(0, Math.ceil((nextResendAt - now) / 1000))
}

export function getNextVerificationRefreshDelay(verifications, now = Date.now()) {
  const delays = []

  for (const verification of verifications ?? []) {
    if (!['PENDING', 'SEND_FAILED'].includes(verification?.status)) {
      continue
    }

    if (getResendDelaySeconds(verification, now) > 0) {
      delays.push(1000)
    }

    const expiresAt = new Date(verification.expiresAt).getTime()
    if (Number.isFinite(expiresAt) && expiresAt > now) {
      delays.push(expiresAt - now + 1)
    }
  }

  return delays.length > 0 ? Math.min(...delays) : null
}

export function upsertEmailVerification(verifications, verification) {
  if (!verification) {
    return verifications
  }

  const next = (verifications ?? [])
    .filter(item => item.id !== verification.id && item.purpose !== verification.purpose)

  return [verification, ...next]
}

export function getConfirmationOutcome(result) {
  const payload = result?.success ? result.data : result?.data

  if (payload?.outcome) {
    return payload.outcome
  }

  if (result?.code === 410) {
    return 'EXPIRED'
  }

  if (result?.code === 409) {
    return 'CONFLICT'
  }

  if (result?.code === 400) {
    return 'INVALID'
  }

  return result?.success ? 'VERIFIED' : 'ERROR'
}

export function requiresEmailVerificationReauthentication(payload) {
  const verification = extractEmailVerification(payload)

  return Boolean(payload?.requiresReauthentication)
    || payload?.purpose === EMAIL_VERIFICATION_PURPOSES.primary
    || verification?.purpose === EMAIL_VERIFICATION_PURPOSES.primary
}
