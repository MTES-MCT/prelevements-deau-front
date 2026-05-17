export const DEFAULT_ZONE_PER_PAGE = 20

export function readListOptions(searchParams = {}) {
  const page = Number.parseInt(searchParams.page || '1', 10)
  const perPage = Number.parseInt(searchParams.perPage || String(DEFAULT_ZONE_PER_PAGE), 10)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : DEFAULT_ZONE_PER_PAGE,
    search: typeof searchParams.search === 'string' ? searchParams.search.trim() : ''
  }
}

export function unwrapPaginatedData(payload, fallback = []) {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: {
        page: 1,
        perPage: payload.length || DEFAULT_ZONE_PER_PAGE,
        pages: 1,
        total: payload.length,
        totalAll: payload.length,
        count: payload.length,
        search: null
      }
    }
  }

  const data = Array.isArray(payload?.data) ? payload.data : fallback

  return {
    data,
    meta: payload?.meta ?? {
      page: 1,
      perPage: data.length || DEFAULT_ZONE_PER_PAGE,
      pages: 1,
      total: data.length,
      totalAll: data.length,
      count: data.length,
      search: null
    }
  }
}
