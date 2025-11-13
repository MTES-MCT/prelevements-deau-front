const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL

export function getDossierURL(dossier) {
  return `/dossiers/${dossier._id}`
}

export function getDossierDSURL(dossier) {
  return `https://www.demarches-simplifiees.fr/procedures/${process.env.NEXT_PUBLIC_PROCEDURE_DS_ID}/a-suivre/dossiers/${dossier.ds.dossierNumber}`
}

export function getDossiersURL() {
  return '/dossiers'
}

export function getPreleveurURL(preleveur) {
  return `/preleveurs/${preleveur.id_preleveur}`
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
  return '/points-prelevement'
}

export function getPointPrelevementURL(point) {
  return `/points-prelevement/${point.id_point}`
}

export function getDeclarationTemplateAEP() {
  return `${STORAGE_URL}/declaration-templates/donnees-standardisees_v2.9.xlsx`
}

export function getDeclarationTemplateTableauSuivi() {
  return `${STORAGE_URL}/declaration-templates/tableau-de-suivi_v2.xlsx`
}
