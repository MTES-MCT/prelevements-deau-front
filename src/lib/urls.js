const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL

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
  return `/preleveurs/${preleveur._id}`
}

export function getNewPreleveurURL(params) {
  const url = '/preleveurs/new'
  if (params) {
    const query = new URLSearchParams(params).toString()
    return `${url}?${query}`
  }

  return url
}

export function getPointsPrelevementURL() {
  return '/prelevements'
}

export function getPointPrelevementURL(point) {
  return `/prelevements/${point._id}`
}

export function getDocumentURL(document) {
  return `${STORAGE_URL}/document/${document.nom_fichier}`
}

export function getDeclarationTemplateAEP() {
  return `${STORAGE_URL}/declaration-templates/donnees-standardisees_v2.9.xlsx`
}

export function getDeclarationTemplateTableauSuivi() {
  return `${STORAGE_URL}/declaration-templates/tableau-de-suivi_v2.xlsx`
}
