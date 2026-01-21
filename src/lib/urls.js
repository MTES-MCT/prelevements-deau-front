const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL

export function getDossierURL(dossier) {
  return `/dossiers/${dossier._id}`
}

export function getDossierDSURL(dossier) {
  return `https://demarche.numerique.gouv.fr/procedures/${process.env.NEXT_PUBLIC_PROCEDURE_DS_ID}/a-suivre/dossiers/${dossier.ds.dossierNumber}`
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

export function getDeclarationsURL() {
  return '/mes-declarations'
}

export function getDeclarationURL(declaration) {
    return `/mes-declarations/${declaration.id}`
}

export function getPointPrelevementURL(point) {
  return `/points-prelevement/${point.id_point}`
}

export function getNewExploitationURL(params) {
  const url = '/exploitations/new'
  if (params) {
    const query = new URLSearchParams(params).toString()
    return `${url}?${query}`
  }

  return url
}

export function getExploitationURL(exploitation) {
  return `/exploitations/${exploitation._id}`
}

export function getDeclarationTemplateAEP() {
  return `${STORAGE_URL}/declaration-templates/donnees-standardisees_v2.10.xlsx`
}

export function getDeclarationTemplateTableauSuivi() {
  return `${STORAGE_URL}/declaration-templates/tableau-de-suivi_v2.xlsx`
}
