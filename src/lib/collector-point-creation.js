export const COLLECTOR_POINT_CREATION_FIELDS = [
  'name', 'usageName', 'coordinates', 'communeCode', 'communeName',
  'geometryPrecision', 'waterBodyType', 'flowType', 'nature', 'withdrawalType',
  'commissioningDate', 'locationDescription', 'comment', 'depth',
  'reservoirNominalVolume', 'isWaterBodyConnectedToStream', 'isWaterBodyConnectedToGroundwater'
]

const IDENTITY_FIELDS = [
  'declarantType', 'preleveurType', 'civility', 'firstName', 'lastName',
  'email', 'jobTitle', 'socialReason', 'addressLine1', 'addressLine2',
  'poBox', 'postalCode', 'city', 'phoneNumber', 'siret'
]

const pickFilled = (value, fields) => Object.fromEntries(fields
  .filter(field => value[field] !== undefined && value[field] !== null && value[field] !== '')
  .map(field => [field, typeof value[field] === 'string' ? value[field].trim() : value[field]]))

export function buildCollectorPointCreationPayload({requestId, point, preleveur, preleveurId, mode, exploitation, notifyAccountCreation}) {
  const identityFields = preleveur.declarantType === 'LEGAL_PERSON'
    ? IDENTITY_FIELDS
    : IDENTITY_FIELDS.filter(field => !['socialReason', 'siret'].includes(field))
  return {
    requestId,
    point: pickFilled(point, COLLECTOR_POINT_CREATION_FIELDS),
    ...(mode === 'new'
      ? {preleveur: pickFilled(preleveur, identityFields)}
      : {preleveurId}),
    exploitation: pickFilled(exploitation, ['usageId', 'secondaryUsageIds', 'status', 'startDate', 'endDate']),
    notifyAccountCreation: mode === 'new' && Boolean(preleveur.email?.trim()) && notifyAccountCreation === true
  }
}

function normalizedName(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('fr')
}

export function findSimilarAccessiblePoints(point, accessiblePoints = []) {
  const names = [normalizedName(point.name), normalizedName(point.usageName)].filter(name => name.length >= 3)
  return accessiblePoints.filter(candidate => names.some(name =>
    [normalizedName(candidate.name), normalizedName(candidate.usageName)].includes(name))).slice(0, 5)
}
