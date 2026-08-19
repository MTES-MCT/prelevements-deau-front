export const DEFAULT_DECLARANTS_PAGE_SIZE = 10
export const DECLARANTS_PAGE_SIZE_OPTIONS = [10, 25, 50]

const DECLARANT_ROLES = new Set(['PRELEVEUR', 'COLLECTEUR'])
const DECLARANT_TYPES = new Set(['NATURAL_PERSON', 'LEGAL_PERSON'])
const PRELEVEUR_TYPES = new Set(['ICPE', 'IRRIGANT', 'GESTIONNAIRE_AEP', 'AUTRE'])
const EMAIL_STATUSES = new Set(['WITH_EMAIL', 'WITHOUT_EMAIL'])
const COLLECTEUR_STATUSES = new Set(['WITH_COLLECTEUR', 'WITHOUT_COLLECTEUR'])
const CONNECTOR_STATUSES = new Set(['WITH_CONNECTOR', 'WITHOUT_CONNECTOR'])
const ACTIVITY_RANGES = new Set([
  'NEVER',
  'LT_30_DAYS',
  'DAYS_30_90',
  'DAYS_91_365',
  'GT_365_DAYS'
])
const DECLARANTS_SORTS = new Set(['RELEVANCE', 'NAME', 'LAST_DECLARATION'])
const WATER_BODY_TYPES = new Set(['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION'])
const EXPLOITATION_STATUSES = new Set([
  'EN_ACTIVITE',
  'TERMINEE',
  'ABANDONNEE',
  'NON_RENSEIGNE'
])

export const DECLARANTS_SCALAR_FILTER_KEYS = [
  'role',
  'declarantType',
  'preleveurType',
  'emailStatus',
  'collecteurStatus',
  'connectorStatus',
  'activityRange'
]

export const DECLARANTS_MULTI_FILTER_KEYS = [
  'zoneIds',
  'usageCodes',
  'waterBodyTypes',
  'exploitationStatuses'
]

function readString(searchParams, key) {
  const value = searchParams?.[key]

  if (Array.isArray(value)) {
    return value[0]?.trim() || ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function readEnum(searchParams, key, values) {
  const value = readString(searchParams, key).toUpperCase()
  return values.has(value) ? value : null
}

function readStrings(searchParams, key) {
  const value = searchParams?.[key]
  const values = Array.isArray(value) ? value : [value]

  return [...new Set(values
    .flatMap(item => typeof item === 'string' ? item.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean))]
    .slice(0, 50)
}

function readEnums(searchParams, key, values) {
  return readStrings(searchParams, key)
    .map(value => value.toUpperCase())
    .filter(value => values.has(value))
}

export function readDeclarantsSearchOptions(searchParams = {}) {
  const requestedPage = Number.parseInt(readString(searchParams, 'page') || '1', 10)
  const requestedPageSize = Number.parseInt(
    readString(searchParams, 'pageSize') || String(DEFAULT_DECLARANTS_PAGE_SIZE),
    10
  )

  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: DECLARANTS_PAGE_SIZE_OPTIONS.includes(requestedPageSize)
      ? requestedPageSize
      : DEFAULT_DECLARANTS_PAGE_SIZE,
    query: readString(searchParams, 'query').slice(0, 200),
    role: readEnum(searchParams, 'role', DECLARANT_ROLES),
    declarantType: readEnum(searchParams, 'declarantType', DECLARANT_TYPES),
    preleveurType: readEnum(searchParams, 'preleveurType', PRELEVEUR_TYPES),
    emailStatus: readEnum(searchParams, 'emailStatus', EMAIL_STATUSES),
    collecteurStatus: readEnum(searchParams, 'collecteurStatus', COLLECTEUR_STATUSES),
    connectorStatus: readEnum(searchParams, 'connectorStatus', CONNECTOR_STATUSES),
    activityRange: readEnum(searchParams, 'activityRange', ACTIVITY_RANGES),
    zoneIds: readStrings(searchParams, 'zoneIds'),
    usageCodes: readStrings(searchParams, 'usageCodes'),
    waterBodyTypes: readEnums(searchParams, 'waterBodyTypes', WATER_BODY_TYPES),
    exploitationStatuses: readEnums(
      searchParams,
      'exploitationStatuses',
      EXPLOITATION_STATUSES
    ),
    sort: readEnum(searchParams, 'sort', DECLARANTS_SORTS)
  }
}

export function buildDeclarantsSearchQuery(options) {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize)
  })

  if (options.query) {
    params.set('query', options.query)
  }

  for (const key of DECLARANTS_SCALAR_FILTER_KEYS) {
    if (options[key]) {
      params.set(key, options[key])
    }
  }

  for (const key of DECLARANTS_MULTI_FILTER_KEYS) {
    for (const value of options[key] || []) {
      params.append(key, value)
    }
  }

  if (options.sort) {
    params.set('sort', options.sort)
  }

  return params.toString()
}

export function buildDeclarantsPathname(pathname, searchParams, values) {
  const params = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(values)) {
    const isDefaultPage = key === 'page' && Number(value) === 1
    const isDefaultPageSize = key === 'pageSize'
      && Number(value) === DEFAULT_DECLARANTS_PAGE_SIZE

    params.delete(key)

    if (value === null || value === undefined || value === '' || value === 'ALL'
      || (Array.isArray(value) && value.length === 0)
      || isDefaultPage || isDefaultPageSize) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined && item !== '' && item !== 'ALL') {
          params.append(key, String(item))
        }
      }
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
