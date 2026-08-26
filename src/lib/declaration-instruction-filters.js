export const DEFAULT_DECLARATION_PAGE = '1'
export const DEFAULT_DECLARATION_PAGE_SIZE = '25'
export const DEFAULT_DECLARATION_TYPES = 'MANUAL,SPREADSHEET'

export const DECLARATION_FILTER_KEYS = [
  'declarant',
  'dossierNumber',
  'endDate',
  'page',
  'pageSize',
  'pointsToAssociate',
  'startDate',
  'types'
]

function getSearchValue(searchParams, key) {
  const value = typeof searchParams?.get === 'function'
    ? searchParams.get(key)
    : searchParams?.[key]
  const candidate = Array.isArray(value) ? value[0] : value

  return typeof candidate === 'string' && candidate ? candidate : undefined
}

function normalizePositiveInteger(value, fallback) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(number) && number > 0 ? String(number) : fallback
}

export function getDeclarationInstructionFilters(searchParams = {}) {
  const filters = {}

  for (const key of DECLARATION_FILTER_KEYS) {
    const value = getSearchValue(searchParams, key)
    if (value) {
      filters[key] = value
    }
  }

  return {
    ...filters,
    types: filters.types ?? DEFAULT_DECLARATION_TYPES
  }
}

export function getDeclarationInstructionRequestOptions(filters = {}) {
  return {
    declarant: filters.declarant,
    dossierNumber: filters.dossierNumber,
    endDate: filters.endDate,
    page: normalizePositiveInteger(filters.page, DEFAULT_DECLARATION_PAGE),
    pageSize: normalizePositiveInteger(filters.pageSize, DEFAULT_DECLARATION_PAGE_SIZE),
    pointsToAssociate: filters.pointsToAssociate,
    startDate: filters.startDate,
    types: filters.types ?? DEFAULT_DECLARATION_TYPES
  }
}

export function getDeclarationInstructionURL(pathname, filters = {}) {
  const parameters = new URLSearchParams()

  for (const key of DECLARATION_FILTER_KEYS) {
    const value = filters[key]
    if (
      !value
      || (key === 'page' && value === DEFAULT_DECLARATION_PAGE)
      || (key === 'pageSize' && value === DEFAULT_DECLARATION_PAGE_SIZE)
      || (key === 'types' && value === DEFAULT_DECLARATION_TYPES)
    ) {
      continue
    }

    parameters.set(key, String(value))
  }

  const search = parameters.toString()
  return search ? `${pathname}?${search}` : pathname
}
