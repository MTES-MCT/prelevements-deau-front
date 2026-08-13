'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import Declarant from '@/components/declarants/declarant.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import {
  DECLARANTS_PAGE_SIZE_OPTIONS,
  buildDeclarantsPathname
} from '@/lib/declarant-search.js'

const ROLE_FILTERS = [
  {value: 'ALL', label: 'Tous'},
  {value: 'PRELEVEUR', label: 'Préleveurs'},
  {value: 'COLLECTEUR', label: 'Collecteurs'}
]

const EMAIL_FILTERS = [
  {value: 'ALL', label: 'Tous les emails'},
  {value: 'WITH_EMAIL', label: 'Avec email'},
  {value: 'WITHOUT_EMAIL', label: 'Sans email'}
]

function getDeclarantId(declarant) {
  return declarant.id || declarant.userId || declarant.user?.id
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function buildPaginationItems(page, totalPages) {
  const pageNumbers = new Set([1, totalPages, page - 1, page, page + 1])
  const sortedPageNumbers = [...pageNumbers]
    .filter(candidate => candidate >= 1 && candidate <= totalPages)
    .sort((left, right) => left - right)
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

const PageSizeSelect = ({pageSize, onPageSizeChange}) => (
  <div className='flex items-center gap-1.5'>
    <label className='fr-label fr-mb-0 whitespace-nowrap text-xs text-gray-600' htmlFor='declarants-page-size'>
      Par page
    </label>
    <div className='relative'>
      <select
        className='h-8 w-16 appearance-none border border-gray-300 bg-white pl-2 pr-6 text-sm'
        id='declarants-page-size'
        value={pageSize}
        onChange={event => onPageSizeChange(Number.parseInt(event.target.value, 10))}
      >
        {DECLARANTS_PAGE_SIZE_OPTIONS.map(option => (
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

const DeclarantsPagination = ({
  className = '',
  currentPage,
  getPageHref,
  total,
  totalPages
}) => {
  const pageItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  )

  if (total === 0 || totalPages <= 1) {
    return null
  }

  return (
    <nav
      className={`flex justify-end ${className}`}
      aria-label='Pagination des déclarants'
    >
      <div className='flex flex-wrap items-center justify-center gap-1'>
        <Button
          disabled={currentPage <= 1}
          priority='tertiary no outline'
          size='small'
          linkProps={{href: getPageHref(currentPage - 1)}}
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
              priority={item === currentPage ? 'primary' : 'tertiary no outline'}
              size='small'
              linkProps={{href: getPageHref(item)}}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={currentPage >= totalPages}
          priority='tertiary no outline'
          size='small'
          linkProps={{href: getPageHref(currentPage + 1)}}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

const ResultsToolbar = ({
  currentPage,
  getPageHref,
  onPageSizeChange,
  pageSize,
  total,
  totalPages
}) => {
  if (total === 0) {
    return null
  }

  const firstItem = Math.min(((currentPage - 1) * pageSize) + 1, total)
  const lastItem = Math.min(currentPage * pageSize, total)

  return (
    <div className='fr-mb-2w flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <p className='fr-text--sm fr-mb-0 font-medium text-gray-900' aria-live='polite'>
          {firstItem}-{lastItem} sur {total} déclarant{total > 1 ? 's' : ''}
        </p>
        <PageSizeSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
      </div>

      <DeclarantsPagination
        currentPage={currentPage}
        getPageHref={getPageHref}
        total={total}
        totalPages={totalPages}
      />
    </div>
  )
}

const DeclarantsList = ({
  basePath = '/declarants',
  counts,
  declarants,
  filters,
  page,
  pageSize,
  total,
  totalPages
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(filters.query)
  const debouncedQuery = useDebouncedValue(query, 350)
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const roleFilter = filters.role || 'ALL'
  const emailFilter = filters.emailStatus || 'ALL'
  const hasActiveFilters = Boolean(filters.query || filters.role || filters.emailStatus)

  useEffect(() => {
    setQuery(filters.query)
  }, [filters.query])

  useEffect(() => {
    const nextQuery = debouncedQuery.trim()

    if (nextQuery === filters.query) {
      return
    }

    router.replace(buildDeclarantsPathname(pathname, searchParams, {
      query: nextQuery,
      page: null
    }), {scroll: false})
  }, [debouncedQuery, filters.query, pathname, router, searchParams])

  const replaceFilters = values => {
    router.replace(buildDeclarantsPathname(pathname, searchParams, {
      query: query.trim(),
      ...values,
      page: null
    }), {scroll: false})
  }

  const getPageHref = nextPage => buildDeclarantsPathname(pathname, searchParams, {
    query: query.trim(),
    page: Math.max(1, nextPage)
  })
  const handlePageSizeChange = nextPageSize => replaceFilters({pageSize: nextPageSize})

  const resetFilters = () => {
    setQuery('')
    replaceFilters({
      query: null,
      role: null,
      emailStatus: null
    })
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-1v'>{pluralize(counts.total, 'déclarant')}</p>
          <p className='fr-text--sm fr-mb-0'>Total visible dans votre périmètre</p>
        </div>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-1v'>{pluralize(counts.preleveurs, 'préleveur')}</p>
          <p className='fr-text--sm fr-mb-0'>{pluralize(counts.collecteurs, 'collecteur')}</p>
        </div>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-0'>{pluralize(counts.withoutEmail, 'déclarant sans email', 'déclarants sans email')}</p>
        </div>
      </div>

      <section className='border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des déclarants'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <h2 className='fr-h6 fr-mb-0'>Filtres</h2>

          {hasActiveFilters && (
            <Button
              priority='secondary'
              size='small'
              iconId='fr-icon-refresh-line'
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        <div className='grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-[minmax(18rem,1fr)_minmax(11rem,.45fr)_minmax(11rem,.45fr)] lg:items-end'>
          <div className='fr-input-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='declarants-search-filter'>Recherche</label>
            <input
              className='fr-input'
              id='declarants-search-filter'
              placeholder='Nom, prénom, raison sociale, email, ville ou SIRET'
              type='search'
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>

          <div className='fr-select-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='declarants-role-filter'>Rôle</label>
            <select
              className='fr-select'
              id='declarants-role-filter'
              value={roleFilter}
              onChange={event => replaceFilters({role: event.target.value})}
            >
              {ROLE_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          </div>

          <div className='fr-select-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='declarants-email-filter'>Email</label>
            <select
              className='fr-select'
              id='declarants-email-filter'
              value={emailFilter}
              onChange={event => replaceFilters({emailStatus: event.target.value})}
            >
              {EMAIL_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className='fr-mt-1w'>
        <ResultsToolbar
          currentPage={currentPage}
          getPageHref={getPageHref}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageSizeChange={handlePageSizeChange}
        />

        {declarants.map((declarant, index) => (
          <Declarant
            key={getDeclarantId(declarant)}
            declarant={declarant}
            index={((currentPage - 1) * pageSize) + index}
            basePath={basePath}
          />
        ))}

        {total === 0 && (
          <div className='border border-gray-200 bg-white px-4 py-6'>
            <p className='fr-mb-0'><i>Aucun déclarant ne correspond à ces filtres</i></p>
          </div>
        )}

        <DeclarantsPagination
          className='fr-mt-3w'
          currentPage={currentPage}
          getPageHref={getPageHref}
          total={total}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}

export default DeclarantsList
