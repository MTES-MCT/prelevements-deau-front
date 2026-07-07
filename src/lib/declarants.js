export const PRELEVEUR_TYPE_ICONS = {
  physique: 'ri-user-line',
  morale: 'ri-building-line',
  collecteur: 'ri-group-line'
}

export const DECLARANT_ROLE_LABELS = {
  PRELEVEUR: 'Préleveur',
  COLLECTEUR: 'Collecteur'
}

export function getDeclarantRoleLabel(role) {
  return DECLARANT_ROLE_LABELS[role] ?? 'Préleveur'
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
