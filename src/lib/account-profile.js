const PROFILE_FIELD_NAMES = Object.freeze({
  common: ['firstName', 'lastName'],
  declarant: [
    'civility',
    'phoneNumber',
    'jobTitle',
    'addressLine1',
    'addressLine2',
    'poBox',
    'postalCode',
    'city'
  ],
  instructor: ['phoneNumber', 'jobTitle']
})

const EMPTY_PROFILE_VALUE = ''
const EMPTY_PROFILE_DETAIL_VALUE = 'Non renseigné'

const PROFILE_FIELD_LABELS = Object.freeze({
  addressLine1: 'Adresse',
  addressLine2: 'Complément d’adresse',
  city: 'Commune',
  civility: 'Civilité',
  firstName: 'Prénom',
  jobTitle: 'Poste ou service',
  lastName: 'Nom',
  phoneNumber: 'Téléphone',
  poBox: 'Boîte postale',
  postalCode: 'Code postal',
  socialReason: 'Nom de la structure'
})

const CIVILITY_LABELS = Object.freeze({
  MR: 'M.',
  MRS: 'Mme'
})

export const ZONE_TYPE_LABELS = Object.freeze({
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'Schéma d’aménagement et de gestion des eaux'
})

function cleanOptionalText(value) {
  const cleaned = String(value ?? '').trim()
  return cleaned || null
}

export function isLegalPersonAccount(user, role) {
  return role === 'DECLARANT' && user?.declarantType === 'LEGAL_PERSON'
}

export function getEditableProfileFieldNames(user, role) {
  const fields = [...PROFILE_FIELD_NAMES.common]

  if (role === 'DECLARANT') {
    fields.push(...PROFILE_FIELD_NAMES.declarant)

    if (isLegalPersonAccount(user, role)) {
      fields.push('socialReason')
    }
  }

  if (role === 'INSTRUCTOR') {
    fields.push(...PROFILE_FIELD_NAMES.instructor)
  }

  return fields
}

export function createProfileForm(user = {}, role) {
  return Object.fromEntries(
    getEditableProfileFieldNames(user, role)
      .map(field => [field, user?.[field] ?? EMPTY_PROFILE_VALUE])
  )
}

function formatProfileDetailValue(field, value) {
  const cleaned = cleanOptionalText(value)

  if (!cleaned) {
    return EMPTY_PROFILE_DETAIL_VALUE
  }

  if (field === 'civility') {
    return CIVILITY_LABELS[cleaned] ?? EMPTY_PROFILE_DETAIL_VALUE
  }

  return cleaned
}

function createProfileDetailGroup(user, {fields, id, labels = {}, title}) {
  return {
    id,
    title,
    items: fields.map(field => ({
      field,
      label: labels[field] ?? PROFILE_FIELD_LABELS[field],
      value: formatProfileDetailValue(field, user?.[field])
    }))
  }
}

export function getProfileDetailGroups(user = {}, role) {
  const isDeclarant = role === 'DECLARANT'
  const isInstructor = role === 'INSTRUCTOR'
  const isLegalPerson = isLegalPersonAccount(user, role)
  const groups = []

  if (isLegalPerson) {
    groups.push(createProfileDetailGroup(user, {
      fields: ['socialReason'],
      id: 'structure',
      title: 'Structure'
    }))
  }

  groups.push(createProfileDetailGroup(user, {
    fields: isDeclarant
      ? ['civility', 'firstName', 'lastName']
      : PROFILE_FIELD_NAMES.common,
    id: isLegalPerson ? 'main-contact' : 'identity',
    labels: isLegalPerson
      ? {
        civility: 'Civilité du contact',
        firstName: 'Prénom du contact',
        lastName: 'Nom du contact'
      }
      : undefined,
    title: isLegalPerson ? 'Contact principal' : 'Identité'
  }))

  if (isDeclarant || isInstructor) {
    groups.push(createProfileDetailGroup(user, {
      fields: ['phoneNumber', 'jobTitle'],
      id: 'professional-details',
      title: 'Coordonnées professionnelles'
    }))
  }

  if (isDeclarant) {
    groups.push(createProfileDetailGroup(user, {
      fields: ['addressLine1', 'addressLine2', 'poBox', 'postalCode', 'city'],
      id: 'postal-address',
      title: 'Adresse postale'
    }))
  }

  return groups
}

export function buildProfilePayload(form, user, role) {
  return Object.fromEntries(
    getEditableProfileFieldNames(user, role)
      .map(field => [field, cleanOptionalText(form?.[field])])
      .filter(([field, value]) => value !== cleanOptionalText(user?.[field]))
  )
}

export function validateProfile(form, user, role) {
  const errors = {}
  const namesAreRequired = !isLegalPersonAccount(user, role)

  if (namesAreRequired && !String(form?.firstName ?? '').trim()) {
    errors.firstName = 'Le prénom est obligatoire.'
  }

  if (namesAreRequired && !String(form?.lastName ?? '').trim()) {
    errors.lastName = 'Le nom est obligatoire.'
  }

  if (isLegalPersonAccount(user, role) && !String(form?.socialReason ?? '').trim()) {
    errors.socialReason = 'Le nom de la structure est obligatoire.'
  }

  const phoneNumber = String(form?.phoneNumber ?? '').trim()
  if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
    errors.phoneNumber = 'Le numéro de téléphone doit contenir 10 chiffres, sans espace.'
  }

  const postalCode = String(form?.postalCode ?? '').trim()
  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    errors.postalCode = 'Le code postal doit contenir 5 chiffres.'
  }

  return errors
}

export function getProfileValidationErrors(validationErrors = []) {
  const errors = {}

  for (const validationError of validationErrors) {
    const path = Array.isArray(validationError?.path)
      ? validationError.path
      : String(validationError?.path ?? '').split('.')
    const field = path.find(item => typeof item === 'string' && item)

    if (field && validationError?.message && !errors[field]) {
      errors[field] = validationError.message
    }
  }

  return errors
}

export function getZoneTypeLabel(type) {
  return ZONE_TYPE_LABELS[type] || 'Zone d’intervention'
}

export function getPermissionGroups(catalog, permissions = []) {
  const selected = new Set(permissions)

  return (catalog?.groups ?? [])
    .map(group => ({
      code: group.code,
      label: group.label,
      permissions: (group.permissions ?? [])
        .filter(permission => selected.has(permission.code))
        .map(permission => ({code: permission.code, label: permission.label}))
    }))
    .filter(group => group.permissions.length > 0)
}
