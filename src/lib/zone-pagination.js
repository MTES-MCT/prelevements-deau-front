export const DEFAULT_ZONE_PER_PAGE = 20

const LIST_FILTER_KEYS = [
  'declarantRole',
  'role',
  'status',
  'usage',
  'collecteur',
  'collector',
  'email',
  'emailStatus'
]

function readString(searchParams, key) {
  const value = searchParams?.[key]

  if (Array.isArray(value)) {
    return value[0]?.trim() || ''
  }

  return typeof value === 'string' ? value.trim() : ''
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
    filters: meta?.filters ?? {}
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
    meta: normalizeMeta(payload?.meta, data.length)
  }
}
