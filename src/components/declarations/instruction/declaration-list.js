'use client'

import {useMemo} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import {DeclarationSummaryListHeader} from '@/components/declarations/declaration-summary-item.js'
import DeclarationItemCard from '@/components/declarations/instruction/declaration-item-card.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import {getDeclarationURL} from '@/lib/urls.js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_OPTIONS = [25, 50, 100]

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

const PageSizeSelect = ({disabled = false, pageSize, setFilters}) => {
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
          disabled={disabled}
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

const DeclarationsPagination = ({className = '', disabled = false, pagination, setFilters}) => {
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
          disabled={disabled || page <= 1}
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
              disabled={disabled}
              priority={item === page ? 'primary' : 'tertiary no outline'}
              size='small'
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={disabled || page >= totalPages}
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
        <p
          className='fr-text--sm fr-mb-0 font-medium text-gray-900'
          role={isLoading ? 'status' : undefined}
        >
          {isLoading
            ? 'Actualisation…'
            : `${firstItem}-${lastItem} sur ${total} déclaration${total > 1 ? 's' : ''}`}
        </p>
        <PageSizeSelect
          disabled={isLoading}
          pageSize={pageSize}
          setFilters={setFilters}
        />
      </div>

      <DeclarationsPagination
        disabled={isLoading}
        pagination={pagination}
        setFilters={setFilters}
      />
    </div>
  )
}

const DeclarationList = ({error, filters, isLoading = false, payload, setFilters}) => {
  const sources = Array.isArray(payload?.items) ? payload.items : []
  const pagination = normalizePagination(payload?.pagination, sources.length, filters)

  if (isLoading && sources.length === 0) {
    return <SimpleLoading />
  }

  if (error && sources.length === 0) {
    return (
      <Alert
        small
        description={error}
        severity='error'
        title='Impossible de charger les déclarations'
      />
    )
  }

  if (sources.length === 0) {
    return (
      <div className='fr-mb-4w border border-gray-200 bg-white px-4 py-6'>
        <p className='fr-mb-0'><i>Aucune déclaration ne correspond à ces paramètres</i></p>
      </div>
    )
  }

  return (
    <div className='fr-mb-4w' aria-busy={isLoading}>
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
        disabled={isLoading}
        pagination={pagination}
        setFilters={setFilters}
      />
    </div>
  )
}

export default DeclarationList
