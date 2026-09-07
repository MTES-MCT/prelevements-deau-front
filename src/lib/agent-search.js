export const DEFAULT_AGENTS_PAGE_SIZE = 10
export const AGENTS_PAGE_SIZE_OPTIONS = [10, 25, 50]

export const AGENT_ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  ALL: 'ALL'
})

export const AGENT_ACCESS_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  FUTURE: 'FUTURE',
  ENDED: 'ENDED',
  NONE: 'NONE'
})

const ACCOUNT_STATUSES = new Set(Object.values(AGENT_ACCOUNT_STATUSES))
const ACCESS_STATUSES = new Set(Object.values(AGENT_ACCESS_STATUSES))
const SORTS = new Set(['RELEVANCE', 'NAME', 'ACTIVE_ZONES', 'CREATED_AT'])
const ORDERS = new Set(['ASC', 'DESC'])
const SORT_ORDERS = Object.freeze({
  RELEVANCE: 'ASC',
  NAME: 'ASC',
  ACTIVE_ZONES: 'DESC',
  CREATED_AT: 'DESC'
})

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
    .slice(0, 100)
}

function readEnums(searchParams, key, values) {
  return readStrings(searchParams, key)
    .map(value => value.toUpperCase())
    .filter(value => values.has(value))
}

export function readAgentsSearchOptions(searchParams = {}) {
  const requestedPage = Number.parseInt(readString(searchParams, 'page') || '1', 10)
  const requestedPageSize = Number.parseInt(
    readString(searchParams, 'pageSize') || String(DEFAULT_AGENTS_PAGE_SIZE),
    10
  )

  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: AGENTS_PAGE_SIZE_OPTIONS.includes(requestedPageSize)
      ? requestedPageSize
      : DEFAULT_AGENTS_PAGE_SIZE,
    query: readString(searchParams, 'query').slice(0, 200),
    accountStatus: readEnum(searchParams, 'accountStatus', ACCOUNT_STATUSES)
      ?? AGENT_ACCOUNT_STATUSES.ACTIVE,
    zoneIds: readStrings(searchParams, 'zoneIds'),
    accessStatuses: readEnums(searchParams, 'accessStatuses', ACCESS_STATUSES),
    sort: readEnum(searchParams, 'sort', SORTS),
    order: readEnum(searchParams, 'order', ORDERS)
  }
}

export function getEffectiveAgentsSort({query = '', sort = null} = {}) {
  if (!query.trim() && sort === 'RELEVANCE') {
    return 'NAME'
  }

  return sort || (query.trim() ? 'RELEVANCE' : 'NAME')
}

export function hasNonCanonicalAgentsSort(options = {}) {
  const canonical = getCanonicalAgentsSort(options)

  return canonical.sort !== options.sort || canonical.order !== options.order
}

export function getCanonicalAgentsSort(options = {}) {
  if (options.sort === 'RELEVANCE' && getEffectiveAgentsSort(options) !== 'RELEVANCE') {
    return {sort: null, order: null}
  }

  if (!options.order) {
    return {
      sort: options.sort ?? null,
      order: options.sort ? SORT_ORDERS[options.sort] : null
    }
  }

  const effectiveSort = getEffectiveAgentsSort(options)
  const expectedOrder = SORT_ORDERS[effectiveSort]

  if (options.order === expectedOrder) {
    return {sort: options.sort ?? null, order: options.order}
  }

  return {
    sort: options.sort ?? null,
    order: options.sort ? expectedOrder : null
  }
}

export function buildAgentsSearchQuery(options = {}) {
  const parameters = new URLSearchParams({
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? DEFAULT_AGENTS_PAGE_SIZE),
    accountStatus: options.accountStatus ?? AGENT_ACCOUNT_STATUSES.ACTIVE
  })

  if (options.query) {
    parameters.set('query', options.query)
  }

  for (const zoneId of options.zoneIds ?? []) {
    parameters.append('zoneIds', zoneId)
  }

  for (const status of options.accessStatuses ?? []) {
    parameters.append('accessStatuses', status)
  }

  if (options.sort || options.query) {
    parameters.set('sort', getEffectiveAgentsSort(options))
  }

  if (options.order) {
    parameters.set('order', options.order)
  }

  return parameters.toString()
}

function appendValues(parameters, key, value) {
  const values = Array.isArray(value) ? value : [value]

  for (const item of values) {
    if (item !== undefined && item !== null && item !== '') {
      parameters.append(key, String(item))
    }
  }
}

function copySearchParameters(parameters, searchParams) {
  if (searchParams && typeof searchParams.entries === 'function') {
    for (const [key, value] of searchParams.entries()) {
      parameters.append(key, value)
    }

    return
  }

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    appendValues(parameters, key, value)
  }
}

function shouldOmitPathnameValue(key, value) {
  const isDefaultPage = key === 'page' && Number(value) === 1
  const isDefaultPageSize = key === 'pageSize'
    && Number(value) === DEFAULT_AGENTS_PAGE_SIZE
  const isDefaultAccountStatus = key === 'accountStatus'
    && value === AGENT_ACCOUNT_STATUSES.ACTIVE
  const isEmpty = value === null || value === undefined || value === ''

  return isEmpty
    || (Array.isArray(value) && value.length === 0)
    || isDefaultPage
    || isDefaultPageSize
    || isDefaultAccountStatus
}

export function buildAgentsPathname(pathname, searchParams, values) {
  const parameters = new URLSearchParams()
  copySearchParameters(parameters, searchParams)

  for (const [key, value] of Object.entries(values)) {
    parameters.delete(key)

    if (!shouldOmitPathnameValue(key, value)) {
      appendValues(parameters, key, value)
    }
  }

  const query = parameters.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function isAgentsSearchResult(value) {
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
