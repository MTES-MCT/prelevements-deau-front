'use client'

import {useMemo} from 'react'
import {Button} from '@codegouvfr/react-dsfr/Button'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

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

const PageSizeSelect = ({disabled = false, id, pageSize, onPageSizeChange}) => {
  return (
    <div className='flex items-center gap-1.5'>
      <label className='fr-label fr-mb-0 whitespace-nowrap text-xs text-gray-600' htmlFor={id}>
        Par page
      </label>
      <div className='relative'>
        <select
          className='h-8 w-16 appearance-none border border-gray-300 bg-white pl-2 pr-6 text-sm'
          disabled={disabled}
          id={id}
          value={pageSize}
          onChange={event => onPageSizeChange(Number(event.target.value))}
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

export const DeclarationsPagination = ({className = '', disabled = false, pagination, onPageChange}) => {
  const {page, total, totalPages} = pagination

  const pageItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages])

  if (total === 0) {
    return null
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
          onClick={() => onPageChange(page - 1)}
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
              aria-current={item === page ? 'page' : undefined}
              priority={item === page ? 'primary' : 'tertiary no outline'}
              size='small'
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={disabled || page >= totalPages}
          priority='tertiary no outline'
          size='small'
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

export const DeclarationResultsToolbar = ({isLoading, error, itemsLength, pagination, onPageChange, onPageSizeChange, resultsRef, pageSizeId = 'declarations-page-size'}) => {
  const {page, pageSize, total} = pagination

  if (total === 0) {
    return null
  }

  const hasTotal = Number.isInteger(total)
  const firstItem = hasTotal ? Math.min(((page - 1) * pageSize) + 1, total) : itemsLength > 0 ? ((page - 1) * pageSize) + 1 : 0
  const lastItem = hasTotal ? Math.min(page * pageSize, total) : firstItem + Math.max(0, itemsLength - 1)
  const summary = hasTotal
    ? `${firstItem}-${lastItem} sur ${total} déclaration${total > 1 ? 's' : ''}`
    : itemsLength > 0 ? `${firstItem}-${lastItem} déclaration${itemsLength > 1 ? 's' : ''}` : '0 déclaration'

  return (
    <div className='fr-mb-2w flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <p
          ref={resultsRef}
          tabIndex={resultsRef ? -1 : undefined}
          aria-live={resultsRef ? 'polite' : undefined}
          className='fr-text--sm fr-mb-0 font-medium text-gray-900'
          role={isLoading ? 'status' : undefined}
        >
          {isLoading
            ? 'Actualisation…'
            : error ? 'Déclarations indisponibles' : summary}
        </p>
        <PageSizeSelect
          disabled={isLoading}
          id={pageSizeId}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>

      <DeclarationsPagination
        disabled={isLoading || Boolean(error)}
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  )
}

