export function displayPreleveur(preleveur) {
  if (!preleveur) {
    return
  }

  if (preleveur.sigle) {
    return preleveur.sigle
  }

  if (preleveur.raison_sociale) {
    return preleveur.raison_sociale
  }

  if (preleveur.nom) {
    return `${preleveur.civilite || ''} ${preleveur.nom} ${preleveur.prenom}`
  }
}
