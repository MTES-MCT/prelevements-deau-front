export const DEFAULT_ZONE_PER_PAGE = 20

const LIST_FILTER_KEYS = [
  'declarantRole',
  'role',
  'status',
  'usage',
  'collecteur',
  'collector',
  'email',
  'emailStatus',
  'declarantType',
  'preleveurType',
  'collecteurStatus',
  'connectorStatus',
  'activityRange'
]

const LIST_MULTI_FILTER_KEYS = [
  'usageCodes',
  'waterBodyTypes',
  'flowTypes',
  'exploitationStatuses',
  'preleveurTypes'
]

function readString(searchParams, key) {
  const value = searchParams?.[key]

  if (Array.isArray(value)) {
    return value[0]?.trim() || ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function readStrings(searchParams, key) {
  const value = searchParams?.[key]
  const values = Array.isArray(value) ? value : [value]

  return [...new Set(values
    .flatMap(item => typeof item === 'string' ? item.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean))]
}

export function getCanonicalListFilterValues(
  filters = {},
  keys = [],
  {multiple = false} = {}
) {
  const key = keys.find(candidate => Object.hasOwn(filters, candidate))

  if (!key) {
    return null
  }

  const rawValue = filters[key]
  const values = [...new Set((Array.isArray(rawValue) ? rawValue : [rawValue])
    .flatMap(value => typeof value === 'string' ? value.split(',') : [])
    .map(value => value.trim())
    .filter(Boolean))]

  return multiple ? values : values.slice(0, 1)
}

export function getEffectiveListSort({
  availableSorts = [],
  fallbackSort = 'NAME',
  search = '',
  sort = null
} = {}) {
  const allowed = new Set(availableSorts)
  const fallback = allowed.has(fallbackSort) ? fallbackSort : availableSorts[0] ?? null
  const candidate = typeof sort === 'string' ? sort.toUpperCase() : null

  if (!search && candidate === 'RELEVANCE') {
    return fallback
  }

  if (candidate && allowed.has(candidate)) {
    return candidate
  }

  if (search && allowed.has('RELEVANCE')) {
    return 'RELEVANCE'
  }

  return fallback
}

function normalizeMeta(meta, fallbackCount = 0) {
  const count = Number(meta?.count ?? fallbackCount)
  const total = Number(meta?.total ?? fallbackCount)
  const totalAll = Number(meta?.totalAll ?? total)
  const page = Number(meta?.page ?? 1)
  const perPage = Number(meta?.perPage ?? DEFAULT_ZONE_PER_PAGE)
  const pages = Number(meta?.pages ?? Math.max(1, Math.ceil(total / perPage)))

  return {
    page,
    perPage,
    pages,
    total,
    totalAll,
    count,
    search: meta?.search ?? null,
    filters: meta?.filters ?? {},
    facets: meta?.facets ?? {},
    sort: meta?.sort ?? null,
    order: meta?.order ?? null
  }
}

export function readListOptions(searchParams = {}) {
  const page = Number.parseInt(readString(searchParams, 'page') || '1', 10)
  const perPage = Number.parseInt(readString(searchParams, 'perPage') || String(DEFAULT_ZONE_PER_PAGE), 10)
  const options = {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : DEFAULT_ZONE_PER_PAGE,
    search: readString(searchParams, 'search')
  }

  for (const key of LIST_FILTER_KEYS) {
    const value = readString(searchParams, key)

    if (value) {
      options[key] = value
    }
  }

  for (const key of LIST_MULTI_FILTER_KEYS) {
    const values = readStrings(searchParams, key)

    if (values.length > 0) {
      options[key] = values
    }
  }

  const sort = readString(searchParams, 'sort')

  if (sort) {
    options.sort = sort
  }

  const order = readString(searchParams, 'order')

  if (order) {
    options.order = order
  }

  return options
}

export function unwrapPaginatedData(payload, fallback = []) {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: normalizeMeta(null, payload.length)
    }
  }

  const data = Array.isArray(payload?.data) ? payload.data : fallback

  return {
    data,
    meta: normalizeMeta({
      ...payload?.meta,
      facets: payload?.facets ?? payload?.meta?.facets
    }, data.length)
  }
}
