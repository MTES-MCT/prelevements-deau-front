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
  // Considered "morale" if code_siren OR raison_sociale OR sigle is defined
  return !(preleveur?.code_siren || preleveur?.raison_sociale || preleveur?.sigle)
}

/**
 * Returns the display title for a preleveur
 * @param {object} preleveur - The preleveur object
 * @returns {string} The formatted title
 */
export function getPreleveurTitle(preleveur) {
  if (isPreleveurPhysique(preleveur)) {
    const parts = [preleveur?.civility, preleveur?.user?.firstName, preleveur?.user?.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
  }

  return preleveur.socialReason || 'Non renseigné'
}
