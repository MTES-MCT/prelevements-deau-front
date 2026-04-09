export function getDeclarationsURL() {
  return '/declarations'
}

export function getDeclarationURL(sourceId) {
  return `/declarations/${sourceId}`
}

export function getDeclarantsURL() {
  return '/declarants'
}

export function getDeclarantURL(declarant) {
  return `/declarants/${declarant.id}`
}

export function getPointsPrelevementURL() {
  return '/points-prelevement'
}

export function getMyDeclarationsURL() {
  return '/mes-declarations'
}

export function getMyDeclarationURL(declaration) {
  return `/mes-declarations/${declaration.id}`
}

export function getPointPrelevementURL(point) {
  return `/points-prelevement/${point.id}`
}

export function getNewExploitationURL(params) {
  const url = '/exploitations/new'
  if (params) {
    const query = new URLSearchParams(params).toString()
    return `${url}?${query}`
  }

  return url
}
