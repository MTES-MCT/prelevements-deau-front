export const DEFAULT_DECLARANTS_PAGE_SIZE = 10
export const DECLARANTS_PAGE_SIZE_OPTIONS = [10, 25, 50]

const DECLARANT_ROLES = new Set(['PRELEVEUR', 'COLLECTEUR'])
const EMAIL_STATUSES = new Set(['WITH_EMAIL', 'WITHOUT_EMAIL'])

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
    emailStatus: readEnum(searchParams, 'emailStatus', EMAIL_STATUSES)
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

  if (options.role) {
    params.set('role', options.role)
  }

  if (options.emailStatus) {
    params.set('emailStatus', options.emailStatus)
  }

  return params.toString()
}

export function buildDeclarantsPathname(pathname, searchParams, values) {
  const params = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(values)) {
    const isDefaultPage = key === 'page' && Number(value) === 1
    const isDefaultPageSize = key === 'pageSize'
      && Number(value) === DEFAULT_DECLARANTS_PAGE_SIZE

    if (value === null || value === undefined || value === '' || value === 'ALL'
      || isDefaultPage || isDefaultPageSize) {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
