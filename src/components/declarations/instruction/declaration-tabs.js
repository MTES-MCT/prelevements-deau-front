'use client'

import {useCallback, useTransition} from 'react'

import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import DeclarationFilters from '@/components/declarations/instruction/declaration-filters.js'
import DeclarationList from '@/components/declarations/instruction/declaration-list.js'
import {
  getDeclarationInstructionFilters,
  getDeclarationInstructionURL
} from '@/lib/declaration-instruction-filters.js'

const DeclarationTabs = ({initialError = null, initialPayload = null}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const filters = getDeclarationInstructionFilters(searchParams)

  const handleSetFilters = useCallback(updater => {
    const next = updater(filters)
    const url = getDeclarationInstructionURL(pathname, next)

    startTransition(() => {
      router.replace(url, {scroll: false})
    })
  }, [filters, pathname, router, startTransition])

  return (
    <div>
      <DeclarationFilters
        filters={filters}
        setFilters={handleSetFilters}
      />
      <DeclarationList
        error={initialError}
        filters={filters}
        isLoading={isPending}
        payload={initialPayload}
        setFilters={handleSetFilters}
      />
    </div>
  )
}

export default DeclarationTabs
