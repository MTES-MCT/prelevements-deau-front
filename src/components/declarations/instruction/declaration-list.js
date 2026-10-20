'use client'

import Alert from '@codegouvfr/react-dsfr/Alert'

import {DeclarationSummaryListHeader} from '@/components/declarations/declaration-summary-item.js'
import {DeclarationsPagination, DeclarationResultsToolbar} from '@/components/declarations/declaration-pagination.js'
import DeclarationItemCard from '@/components/declarations/instruction/declaration-item-card.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import {getDeclarationURL} from '@/lib/urls.js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25

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

const DeclarationList = ({error, filters, isLoading = false, payload, setFilters}) => {
  const sources = Array.isArray(payload?.items) ? payload.items : []
  const pagination = normalizePagination(payload?.pagination, sources.length, filters)
  const setPage = page => setFilters(previous => ({...previous, page: String(page)}))
  const setPageSize = pageSize => setFilters(previous => ({...previous, page: undefined, pageSize: String(pageSize)}))

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
      <DeclarationResultsToolbar
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
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
        onPageChange={setPage}
      />
    </div>
  )
}

export default DeclarationList
