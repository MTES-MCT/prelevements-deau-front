export function getDeclarationsURL() {
  return '/declarations'
}

export function getDeclarationURL(sourceId) {
  return `/declarations/${sourceId}`
}

export function getDeclarantsURL() {
  return '/declarants'
}

export function getDeclarantId(declarant) {
  return declarant?.userId || declarant?.id || declarant?.user?.id
}

export function getDeclarantURL(declarant) {
  return `/declarants/${getDeclarantId(declarant)}`
}

export function getPreleveursURL() {
  return '/preleveurs'
}

export function getPreleveurURL(declarant) {
  return `/preleveurs/${getDeclarantId(declarant)}`
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

export function getMyDeclarationSubmissionSuccessURL(declaration) {
  return `${getMyDeclarationURL(declaration)}?submitted=1`
}

export function getMyTelemetrySourceURL(source) {
  return `/mes-declarations/sources/${source.id}`
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
