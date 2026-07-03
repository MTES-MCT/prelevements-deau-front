'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

import {DeclarationSummaryListHeader} from '@/components/declarations/declaration-summary-item.js'
import DeclarationItemCard from '@/components/declarations/instruction/declaration-item-card.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import {getDeclarationURL} from '@/lib/urls.js'
import {getMySourcesAction} from '@/server/actions/sources.js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_OPTIONS = [25, 50, 100]
const tabStatusMap = {
  'a-rapprocher': ['TO_INSTRUCT', 'INSTRUCTION_IN_PROGRESS', 'PARTIALLY_VALIDATED']
}

function toPositiveInteger(value, fallback) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(number) && number > 0 ? number : fallback
}

function normalizePagination(pagination, itemsLength, filters) {
  const page = toPositiveInteger(pagination?.page ?? filters.page, DEFAULT_PAGE)
  const pageSize = toPositiveInteger(pagination?.pageSize ?? filters.pageSize, DEFAULT_PAGE_SIZE)
  const total = Number.isInteger(pagination?.total) ? pagination.total : itemsLength

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
}

function buildPaginationItems(page, totalPages) {
  const pageNumbers = new Set([1, totalPages, page - 1, page, page + 1])
  const sortedPageNumbers = [...pageNumbers]
    .filter(candidate => candidate >= 1 && candidate <= totalPages)
    .sort((a, b) => a - b)
  const items = []

  for (const [index, pageNumber] of sortedPageNumbers.entries()) {
    const previousPage = sortedPageNumbers[index - 1]

    if (previousPage && pageNumber - previousPage > 1) {
      items.push(`ellipsis-${previousPage}-${pageNumber}`)
    }

    items.push(pageNumber)
  }

  return items
}

const PageSizeSelect = ({pageSize, setFilters}) => {
  const setPageSize = value => {
    setFilters(previous => ({
      ...previous,
      page: undefined,
      pageSize: String(value)
    }))
  }

  return (
    <div className='flex items-center gap-1.5'>
      <label className='fr-label fr-mb-0 whitespace-nowrap text-xs text-gray-600' htmlFor='declarations-page-size'>
        Par page
      </label>
      <div className='relative'>
        <select
          className='h-8 w-16 appearance-none border border-gray-300 bg-white pl-2 pr-6 text-sm'
          id='declarations-page-size'
          value={pageSize}
          onChange={event => setPageSize(event.target.value)}
        >
          {PAGE_SIZE_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span
          className='fr-icon-arrow-down-s-line pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.62rem] text-gray-500 [&::after]:![--icon-size:0.68rem] [&::before]:![--icon-size:0.68rem]'
          aria-hidden='true'
        />
      </div>
    </div>
  )
}

const DeclarationsPagination = ({className = '', pagination, setFilters}) => {
  const {page, total, totalPages} = pagination

  const pageItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages])

  if (total === 0) {
    return null
  }

  const setPage = nextPage => {
    setFilters(previous => ({
      ...previous,
      page: String(nextPage)
    }))
  }

  return (
    <nav
      className={`flex justify-end ${className}`}
      aria-label='Pagination des déclarations'
    >
      <div className='flex flex-wrap items-center justify-center gap-1'>
        <Button
          disabled={page <= 1}
          priority='tertiary no outline'
          size='small'
          onClick={() => setPage(page - 1)}
        >
          Précédent
        </Button>

        {pageItems.map(item => {
          if (typeof item === 'string') {
            return (
              <span key={item} className='inline-flex h-8 min-w-8 items-center justify-center text-sm leading-none text-gray-500'>
                …
              </span>
            )
          }

          return (
            <Button
              key={item}
              priority={item === page ? 'primary' : 'tertiary no outline'}
              size='small'
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={page >= totalPages}
          priority='tertiary no outline'
          size='small'
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

const ResultsToolbar = ({isLoading, pagination, setFilters}) => {
  const {page, pageSize, total} = pagination

  if (total === 0) {
    return null
  }

  const firstItem = Math.min(((page - 1) * pageSize) + 1, total)
  const lastItem = Math.min(page * pageSize, total)

  return (
    <div className='fr-mb-2w flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <p className='fr-text--sm fr-mb-0 font-medium text-gray-900'>
          {isLoading
            ? 'Actualisation…'
            : `${firstItem}-${lastItem} sur ${total} déclaration${total > 1 ? 's' : ''}`}
        </p>
        <PageSizeSelect pageSize={pageSize} setFilters={setFilters} />
      </div>

      <DeclarationsPagination pagination={pagination} setFilters={setFilters} />
    </div>
  )
}

const DeclarationList = ({status, filters, setFilters}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [sources, setSources] = useState([])
  const [pagination, setPagination] = useState(() => normalizePagination(null, 0, filters))

  const page = toPositiveInteger(filters.page, DEFAULT_PAGE)
  const pageSize = toPositiveInteger(filters.pageSize, DEFAULT_PAGE_SIZE)

  useEffect(() => {
    let cancelled = false

    async function fetchSources() {
      setIsLoading(true)

      const result = await getMySourcesAction({
        declarant: filters.declarant,
        dossierNumber: filters.dossierNumber,
        endDate: filters.endDate,
        page,
        pageSize,
        pointsToAssociate: filters.pointsToAssociate,
        startDate: filters.startDate,
        statuses: tabStatusMap[status] || [],
        types: filters.types
      })

      if (!cancelled && result.success) {
        const payload = result.data.data
        const items = Array.isArray(payload?.items) ? payload.items : []
        setSources(items)
        setPagination(normalizePagination(payload?.pagination, items.length, {page, pageSize}))
      }

      if (!cancelled) {
        setIsLoading(false)
      }
    }

    fetchSources()

    return () => {
      cancelled = true
    }
  }, [
    filters.declarant,
    filters.dossierNumber,
    filters.endDate,
    filters.pointsToAssociate,
    filters.startDate,
    filters.types,
    page,
    pageSize,
    status
  ])

  if (isLoading && sources.length === 0) {
    return <SimpleLoading />
  }

  if (!isLoading && sources.length === 0) {
    return (
      <div className='fr-mb-4w border border-gray-200 bg-white px-4 py-6'>
        <p className='fr-mb-0'><i>Aucune déclaration ne correspond à ces paramètres</i></p>
      </div>
    )
  }

  return (
    <div className='fr-mb-4w'>
      <ResultsToolbar
        isLoading={isLoading}
        pagination={pagination}
        setFilters={setFilters}
      />

      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        <DeclarationSummaryListHeader />
        {sources.map(source => (
          <DeclarationItemCard
            key={source.id}
            source={source}
            url={getDeclarationURL(source.id)}
          />
        ))}
      </div>

      <DeclarationsPagination
        className='fr-mt-3w'
        pagination={pagination}
        setFilters={setFilters}
      />
    </div>
  )
}

export default DeclarationList
