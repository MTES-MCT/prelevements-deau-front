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
  // If siret exists, it's a "personne morale"
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
  // Considered "morale" if siret OR raison_sociale OR sigle is defined
  return !(preleveur?.siret || preleveur?.raison_sociale || preleveur?.sigle)
}

/**
 * Returns the display title for a preleveur
 * @param {object} preleveur - The preleveur object
 * @returns {string} The formatted title
 */
export function getPreleveurTitle(preleveur) {
  if (isPreleveurPhysique(preleveur)) {
    // Physical person: civilite, nom, prenom
    const parts = [preleveur?.civilite, preleveur?.nom, preleveur?.prenom].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Non renseigné'
  }

  // Moral person: sigle or raison_sociale
  return preleveur.raison_sociale || preleveur.sigle || 'Non renseigné'
}
