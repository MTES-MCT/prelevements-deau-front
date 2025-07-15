const API_URL = process.env.NEXT_PUBLIC_STORAGE_URL

export function getDossierURL(dossier) {
  return `/dossiers/${dossier._id}`
}

export function getDossierDSURL(dossier) {
  return `https://www.demarches-simplifiees.fr/procedures/${process.env.NEXT_PUBLIC_PROCEDURE_DS_ID}/a-suivre/dossiers/${dossier.number}`
}

export function getDossiersURL() {
  return '/dossiers'
}

export function getPreleveurURL(preleveur) {
  return `/preleveurs/${preleveur.id_preleveur}`
}

export function getDocumentURL(document) {
  return `${API_URL}/document/${document.nom_fichier}`
}
