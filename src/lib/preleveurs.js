/**
 * Preleveur type icons and helpers
 */

// Icons for preleveur types (person physique vs morale)
export const PRELEVEUR_TYPE_ICONS = {
  physique: 'ri-user-line',
  morale: 'ri-building-line'
}

/**
 * Returns the appropriate icon ID based on preleveur type
 * @param {object} preleveur - The preleveur object
 * @returns {string} The icon ID to use
 */
export function getPreleveurTypeIcon(preleveur) {
  // If code_siren exists, it's a "personne morale"
  if (isPreleveurPhysique(preleveur)) {
    return PRELEVEUR_TYPE_ICONS.physique
  }

  return PRELEVEUR_TYPE_ICONS.morale
}

/**
 * Returns whether the preleveur is a physical person
 * @param {object} preleveur - The preleveur object
 * @returns {boolean} True if physical person, false if moral person
 */
export function isPreleveurPhysique(preleveur) {
  return !preleveur?.socialReason
}

/**
 * Returns the display title for a preleveur
 * @param {object} preleveur - The preleveur object
 * @returns {string} The formatted title
 */
export function getDeclarantTitleFromDeclarant(preleveur) {
  if (isPreleveurPhysique(preleveur)) {
    const parts = [preleveur?.civility, preleveur?.user?.firstName, preleveur?.user?.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
  }

  return preleveur.socialReason || 'Non renseigné'
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
