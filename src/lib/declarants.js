export const PRELEVEUR_TYPE_ICONS = {
  physique: 'ri-user-line',
  morale: 'ri-building-line',
  collecteur: 'ri-group-line'
}

export const PRELEVEUR_TYPE_LABELS = {
  ICPE: 'ICPE',
  IRRIGANT: 'Irrigant',
  GESTIONNAIRE_AEP: 'Gestionnaire AEP',
  AUTRE: 'Autre'
}

export const PRELEVEUR_TYPE_OPTIONS = Object.entries(PRELEVEUR_TYPE_LABELS)
  .map(([value, label]) => ({value, label}))

export const DECLARANT_PERSON_TYPE_LABELS = {
  NATURAL_PERSON: 'Personne physique',
  LEGAL_PERSON: 'Personne morale'
}

export const DECLARANT_ROLE_LABELS = {
  PRELEVEUR: 'Préleveur',
  COLLECTEUR: 'Collecteur'
}

export function getDeclarantRoleLabel(role) {
  return DECLARANT_ROLE_LABELS[role] ?? 'Préleveur'
}

export function normalizePreleveurTypeForRole(declarantRole, preleveurType) {
  if (declarantRole === 'COLLECTEUR') {
    return null
  }

  return preleveurType || null
}

export function getPreleveurType(declarant) {
  const role = declarant?.declarantRole ?? declarant?.declarant?.declarantRole ?? 'PRELEVEUR'
  const preleveurType = declarant?.preleveurType ?? declarant?.declarant?.preleveurType

  return normalizePreleveurTypeForRole(role, preleveurType)
}

export function getPreleveurTypeLabel(preleveurType) {
  return PRELEVEUR_TYPE_LABELS[preleveurType] ?? null
}

export function isDeclarationNotificationsEnabled(declarant) {
  return declarant?.declarationNotificationsEnabled ?? declarant?.declarant?.declarationNotificationsEnabled ?? true
}

export function getDeclarantTypeIcon(declarant) {
  if (declarant?.declarantRole === 'COLLECTEUR' || declarant?.declarant?.declarantRole === 'COLLECTEUR') {
    return PRELEVEUR_TYPE_ICONS.collecteur
  }

  if (isDeclarantPhysique(declarant)) {
    return PRELEVEUR_TYPE_ICONS.physique
  }

  return PRELEVEUR_TYPE_ICONS.morale
}

export function isDeclarantPhysique(declarant) {
  return declarant?.declarantType !== 'LEGAL_PERSON' && !declarant?.socialReason && !declarant?.declarant?.socialReason
}

export function getDeclarantTitleFromDeclarant(declarant) {
  if (!declarant) {
    return 'Non renseigné'
  }

  if (isDeclarantPhysique(declarant)) {
    const parts = [
      declarant?.civility,
      declarant?.firstName ?? declarant?.user?.firstName,
      declarant?.lastName ?? declarant?.user?.lastName
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
  }

  return declarant.socialReason || declarant?.declarant?.socialReason || 'Non renseigné'
}

export function getDeclarantTitleFromUser(user) {
  if (user?.declarant?.socialReason) {
    return user.declarant.socialReason
  }

  if (user?.socialReason) {
    return user.socialReason
  }

  const parts = [
    user?.civility,
    user?.firstName ?? user?.user?.firstName,
    user?.lastName ?? user?.user?.lastName
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
}
