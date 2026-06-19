'use client'

import {useCallback, useState} from 'react'

import {useRouter, usePathname, useSearchParams} from 'next/navigation'

import DeclarationFilters from '@/components/declarations/instruction/declaration-filters.js'
import DeclarationList from '@/components/declarations/instruction/declaration-list.js'

const DeclarationTabs = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [periodOptions, setPeriodOptions] = useState([{value: 'all', label: 'Tout'}])

  const getFiltersFromURL = () => {
    const filters = {}
    for (const key of ['declarant', 'dossierNumber', 'periode']) {
      const value = searchParams.get(key)
      if (value) {
        filters[key] = value
      }
    }

    return filters
  }

  const filters = getFiltersFromURL()

  const handleSetFilters = updater => {
    const next = updater(filters)
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all') {
        params.set(key, value)
      }
    }

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleAvailablePeriodsChange = useCallback(options => {
    setPeriodOptions(options?.length ? options : [{value: 'all', label: 'Tout'}])
  }, [])

  return (
    <div className='fr-mt-4w'>
      <DeclarationFilters
        filters={filters}
        setFilters={handleSetFilters}
        periodOptions={periodOptions}
      />
      <DeclarationList
        filters={filters}
        onAvailablePeriodsChange={handleAvailablePeriodsChange}
      />
    </div>
  )
}

export default DeclarationTabs
