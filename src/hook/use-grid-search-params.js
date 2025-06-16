'use client'

import {useMemo} from 'react'

import {useSearchParams, useRouter} from 'next/navigation'

export function useGridSearchParams({defaultSort = [{field: 'dateDepot', sort: 'desc'}]} = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialFilterModel = useMemo(() => {
    const filters = searchParams.get('filters')
    if (filters) {
      try {
        return JSON.parse(decodeURIComponent(filters))
      } catch {}
    }

    return {items: []}
  }, [searchParams])

  const initialSortModel = useMemo(() => {
    const sort = searchParams.get('sort')
    if (sort) {
      try {
        return JSON.parse(decodeURIComponent(sort))
      } catch {}
    }

    return defaultSort
  }, [searchParams, defaultSort])

  const onFilterModelChange = newModel => {
    const current = searchParams.get('filters')
    const newValue = newModel.items?.length > 0 ? JSON.stringify(newModel) : null
    if (current === newValue) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (newValue) {
      params.set('filters', newValue)
    } else {
      params.delete('filters')
    }

    const query = params.toString()
    router.replace(query ? `?${query}` : window.location.pathname)
  }

  const onSortModelChange = newModel => {
    const current = searchParams.get('sort')
    const newValue = newModel?.length > 0 ? JSON.stringify(newModel) : null
    if (current === newValue) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (newValue) {
      params.set('sort', newValue)
    } else {
      params.delete('sort')
    }

    const query = params.toString()
    router.replace(query ? `?${query}` : window.location.pathname)
  }

  return {
    initialFilterModel, initialSortModel, onFilterModelChange, onSortModelChange
  }
}
