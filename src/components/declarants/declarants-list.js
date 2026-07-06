'use client'

import {
  useEffect, useMemo, useRef, useState
} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

import FlexSearch from '../../../node_modules/flexsearch/dist/flexsearch.bundle.module.min.js'

import Declarant from '@/components/declarants/declarant.js'
import {normalizeString} from '@/utils/string.js'

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50]

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

function getDeclarantRole(declarant) {
  return declarant.declarant?.declarantRole || declarant.declarantRole || 'PRELEVEUR'
}

function getDeclarantSearchDocument(declarant) {
  return {
    id: getDeclarantId(declarant),
    lastName: normalizeString(declarant.lastName),
    firstName: normalizeString(declarant.firstName),
    socialReason: normalizeString(declarant?.declarant?.socialReason || declarant.socialReason),
    email: normalizeString(declarant.email),
    role: normalizeString(getDeclarantRole(declarant)),
    city: normalizeString(declarant?.declarant?.city || declarant.city)
  }
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
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

const DeclarantsPagination = ({
  className = '',
  currentPage,
  setPage,
  total,
  totalPages
}) => {
  const pageItems = useMemo(() => buildPaginationItems(currentPage, totalPages), [currentPage, totalPages])

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
          onClick={() => setPage(currentPage - 1)}
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
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={currentPage >= totalPages}
          priority='tertiary no outline'
          size='small'
          onClick={() => setPage(currentPage + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

const ResultsToolbar = ({
  currentPage,
  onPageSizeChange,
  pageSize,
  setPage,
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
        <p className='fr-text--sm fr-mb-0 font-medium text-gray-900'>
          {firstItem}-{lastItem} sur {total} déclarant{total > 1 ? 's' : ''}
        </p>
        <PageSizeSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
      </div>

      <DeclarantsPagination
        currentPage={currentPage}
        setPage={setPage}
        total={total}
        totalPages={totalPages}
      />
    </div>
  )
}

const DeclarantsList = ({declarants, basePath = '/declarants'}) => {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [emailFilter, setEmailFilter] = useState('ALL')
  const [matchingIds, setMatchingIds] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const index = useRef(null)

  useEffect(() => {
    index.current = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['lastName', 'firstName', 'socialReason', 'email', 'role', 'city'],
        store: true
      },
      tokenize: 'full',
      suggest: true,
      depth: 2
    })

    for (const declarant of declarants) {
      const id = getDeclarantId(declarant)
      index.current.add(id, getDeclarantSearchDocument(declarant))
    }

    setMatchingIds(null)
    setPage(1)
  }, [declarants])

  const handleFilter = event => {
    const {value} = event.target
    const nextQuery = normalizeString(value)

    setQuery(value)
    setPage(1)

    if (nextQuery.length === 0) {
      setMatchingIds(null)
      return
    }

    const results = index.current.search(nextQuery, {
      suggest: true,
      enrich: true,
      bool: 'or',
      threshold: 5
    })

    const ids = new Set()

    for (const result of results) {
      for (const doc of result.result) {
        ids.add(doc.id)
      }
    }

    setMatchingIds(ids)
  }

  const resetFilters = () => {
    setQuery('')
    setMatchingIds(null)
    setRoleFilter('ALL')
    setEmailFilter('ALL')
    setPage(1)
  }

  const handlePageSizeChange = nextPageSize => {
    setPageSize(nextPageSize)
    setPage(1)
  }

  const filteredDeclarants = useMemo(() => declarants.filter(declarant => {
    const id = getDeclarantId(declarant)

    if (matchingIds && !matchingIds.has(id)) {
      return false
    }

    const role = getDeclarantRole(declarant)

    if (roleFilter !== 'ALL' && role !== roleFilter) {
      return false
    }

    if (emailFilter === 'WITH_EMAIL' && !declarant.email) {
      return false
    }

    if (emailFilter === 'WITHOUT_EMAIL' && declarant.email) {
      return false
    }

    return true
  }), [declarants, matchingIds, roleFilter, emailFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDeclarants.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedDeclarants = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredDeclarants.slice(start, end)
  }, [filteredDeclarants, currentPage, pageSize])

  const preleveursCount = declarants.filter(declarant => getDeclarantRole(declarant) === 'PRELEVEUR').length
  const collecteursCount = declarants.filter(declarant => getDeclarantRole(declarant) === 'COLLECTEUR').length
  const withoutEmailCount = declarants.filter(declarant => !declarant.email).length
  const hasActiveFilters = Boolean(query.trim() || roleFilter !== 'ALL' || emailFilter !== 'ALL')

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-1v'>{pluralize(declarants.length, 'déclarant')}</p>
          <p className='fr-text--sm fr-mb-0'>Total visible dans votre périmètre</p>
        </div>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-1v'>{pluralize(preleveursCount, 'préleveur')}</p>
          <p className='fr-text--sm fr-mb-0'>{pluralize(collecteursCount, 'collecteur')}</p>
        </div>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-0'>{pluralize(withoutEmailCount, 'déclarant sans email', 'déclarants sans email')}</p>
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
              placeholder='Nom, prénom, raison sociale, email ou ville'
              type='search'
              value={query}
              onChange={handleFilter}
            />
          </div>

          <div className='fr-select-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='declarants-role-filter'>Type</label>
            <select
              className='fr-select'
              id='declarants-role-filter'
              value={roleFilter}
              onChange={event => {
                setPage(1)
                setRoleFilter(event.target.value)
              }}
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
              onChange={event => {
                setPage(1)
                setEmailFilter(event.target.value)
              }}
            >
              {EMAIL_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className='fr-mt-1w'>
        <ResultsToolbar
          currentPage={currentPage}
          pageSize={pageSize}
          setPage={setPage}
          total={filteredDeclarants.length}
          totalPages={totalPages}
          onPageSizeChange={handlePageSizeChange}
        />

        {paginatedDeclarants.length > 0 && paginatedDeclarants.map((declarant, index) => (
          <Declarant
            key={getDeclarantId(declarant)}
            declarant={declarant}
            index={((currentPage - 1) * pageSize) + index}
            basePath={basePath}
          />
        ))}

        {filteredDeclarants.length === 0 && (
          <div className='border border-gray-200 bg-white px-4 py-6'>
            <p className='fr-mb-0'><i>Aucun déclarant ne correspond à ces filtres</i></p>
          </div>
        )}

        <DeclarantsPagination
          className='fr-mt-3w'
          currentPage={currentPage}
          setPage={setPage}
          total={filteredDeclarants.length}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}

export default DeclarantsList
