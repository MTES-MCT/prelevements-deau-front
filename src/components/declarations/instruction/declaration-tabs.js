'use client'

import {useCallback} from 'react'

import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import DeclarationFilters from '@/components/declarations/instruction/declaration-filters.js'
import DeclarationList from '@/components/declarations/instruction/declaration-list.js'
import ReplayableDeclarationsPanel from '@/components/declarations/instruction/replayable-declarations-panel.js'

const DEFAULT_PAGE = '1'
const DEFAULT_PAGE_SIZE = '25'
const DEFAULT_TYPES = 'MANUAL,SPREADSHEET'
const FILTER_KEYS = ['declarant', 'dossierNumber', 'endDate', 'page', 'pageSize', 'pointsToAssociate', 'startDate', 'types']

const DeclarationTabs = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getFiltersFromURL = () => {
    const filters = {}

    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key)
      if (value) {
        filters[key] = value
      }
    }

    return {
      ...filters,
      types: filters.types ?? DEFAULT_TYPES
    }
  }

  const filters = getFiltersFromURL()

  const handleSetFilters = useCallback(updater => {
    const next = updater(filters)
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(next)) {
      if (
        !value
        || (key === 'page' && value === DEFAULT_PAGE)
        || (key === 'pageSize' && value === DEFAULT_PAGE_SIZE)
        || (key === 'types' && value === DEFAULT_TYPES)
      ) {
        continue
      }

      params.set(key, value)
    }

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {scroll: false})
  }, [filters, pathname, router])

  return (
    <div>
      <ReplayableDeclarationsPanel mode='summary' />
      <DeclarationFilters
        filters={filters}
        setFilters={handleSetFilters}
      />
      <DeclarationList
        filters={filters}
        setFilters={handleSetFilters}
      />
    </div>
  )
}

export default DeclarationTabs
