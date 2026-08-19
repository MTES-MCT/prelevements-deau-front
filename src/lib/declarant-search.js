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
const DECLARANTS_ORDERS = new Set(['ASC', 'DESC'])
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
    sort: readEnum(searchParams, 'sort', DECLARANTS_SORTS),
    order: readEnum(searchParams, 'order', DECLARANTS_ORDERS)
  }
}

export function getEffectiveDeclarantsSort({query = '', sort = null} = {}) {
  if (!query.trim() && sort === 'RELEVANCE') {
    return 'NAME'
  }

  return sort || (query.trim() ? 'RELEVANCE' : 'NAME')
}

export function hasNonCanonicalDeclarantsSort(options = {}) {
  return options.sort === 'RELEVANCE'
    && getEffectiveDeclarantsSort(options) !== 'RELEVANCE'
}

export function isDeclarantsSearchResult(value) {
  return Boolean(
    value
    && Array.isArray(value.items)
    && Number.isInteger(value.page)
    && value.page >= 1
    && Number.isInteger(value.pageSize)
    && value.pageSize >= 1
    && Number.isInteger(value.total)
    && value.total >= 0
    && Number.isInteger(value.totalPages)
    && value.totalPages >= 1
  )
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

  if (options.order) {
    params.set('order', options.order)
  }

  return params.toString()
}

function appendSearchParamValues(params, key, value) {
  const items = Array.isArray(value) ? value : [value]

  for (const item of items) {
    if (item !== undefined && item !== null) {
      params.append(key, String(item))
    }
  }
}

function copySearchParams(params, searchParams) {
  if (searchParams && typeof searchParams.entries === 'function') {
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value)
    }

    return
  }

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    appendSearchParamValues(params, key, value)
  }
}

function shouldOmitPathnameValue(key, value) {
  const isDefaultPage = key === 'page' && Number(value) === 1
  const isDefaultPageSize = key === 'pageSize'
    && Number(value) === DEFAULT_DECLARANTS_PAGE_SIZE
  const isEmpty = value === null || value === undefined || value === '' || value === 'ALL'

  return isEmpty || (Array.isArray(value) && value.length === 0)
    || isDefaultPage || isDefaultPageSize
}

export function buildDeclarantsPathname(pathname, searchParams, values) {
  const params = new URLSearchParams()
  copySearchParams(params, searchParams)

  for (const [key, value] of Object.entries(values)) {
    params.delete(key)

    if (shouldOmitPathnameValue(key, value)) {
      continue
    }

    appendSearchParamValues(
      params,
      key,
      Array.isArray(value) ? value.filter(item => item !== '' && item !== 'ALL') : value
    )
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
