/**
 * Preleveur type icons and helpers
 */

// Icons for preleveur types (person physique vs morale)
export const PRELEVEUR_TYPE_ICONS = {
  physique: 'ri-user-line',
  morale: 'ri-building-line'
}

/**
 * Returns the appropriate icon ID based on declarant type
 * @param {object} declarant - The declarant object
 * @returns {string} The icon ID to use
 */
export function getDeclarantTypeIcon(declarant) {
  // If code_siren exists, it's a "personne morale"
  if (isDeclarantPhysique(declarant)) {
    return PRELEVEUR_TYPE_ICONS.physique
  }

  return PRELEVEUR_TYPE_ICONS.morale
}

/**
 * Returns whether the declarant is a physical person
 * @param {object} declarant - The declarant object
 * @returns {boolean} True if physical person, false if moral person
 */
export function isDeclarantPhysique(declarant) {
  return !declarant?.socialReason
}

/**
 * Returns the display title for a declarant
 * @param {object} declarant - The declarant object
 * @returns {string} The formatted title
 */
export function getDeclarantTitleFromDeclarant(declarant) {
  if (isDeclarantPhysique(declarant)) {
    const parts = [declarant?.civility, declarant?.user?.firstName, declarant?.user?.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
  }

  return declarant.socialReason || 'Non renseigné'
}

/**
 * @param user
 */
export function getDeclarantTitleFromUser(user) {
  if (user?.declarant?.socialReason) {
    return user.declarant.socialReason
  }

  const parts = [user?.civility, user?.firstName, user?.lastName].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
}
