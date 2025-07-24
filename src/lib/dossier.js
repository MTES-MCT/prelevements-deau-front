export const validationStatus = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Avertissement',
  failed: 'Échec'
}

export function getPointsPrelevementId(dossier) {
  if (dossier.pointPrelevement) {
    return [dossier.pointPrelevement]
  }

  if (dossier.donneesPrelevements) {
    return dossier.donneesPrelevements.flatMap(({pointsPrelevements}) => pointsPrelevements)
  }

  return []
}
