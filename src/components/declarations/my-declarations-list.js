'use client'

import {
  useEffect,
  useRef,
  useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import DeclarationSummaryItem, {
  DeclarationSummaryListHeader
} from '@/components/declarations/declaration-summary-item.js'
import {DeclarationsPagination, DeclarationResultsToolbar} from '@/components/declarations/declaration-pagination.js'
import {useAuth} from '@/contexts/auth-context.js'
import {
  hasOtherDeclarations,
  normalizeDeclarationFeedPagination,
  updateDeclarationFeedCursors
} from '@/lib/declaration-feed.js'
import {getMyDeclarationFeedAction} from '@/server/actions/declarations.js'

const declarationTypeFilterOptions = [
  {
    checkboxClassName: 'accent-[#18753c]',
    checkedClassName: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    colorClassName: 'text-[#18753c]',
    iconClassName: 'fr-icon-edit-line',
    label: 'Saisie rapide',
    value: 'MANUAL'
  },
  {
    checkboxClassName: 'accent-[#8d533e]',
    checkedClassName: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    colorClassName: 'text-[#8d533e]',
    iconClassName: 'fr-icon-upload-line',
    label: 'Fichier déposé',
    value: 'SPREADSHEET'
  },
  {
    checkboxClassName: 'accent-[#000091]',
    checkedClassName: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    colorClassName: 'text-[#000091]',
    iconClassName: 'fr-icon-focus-3-line',
    label: 'Télérelève',
    value: 'TELEMETRY'
  },
  {
    checkboxClassName: 'accent-gray-600',
    checkedClassName: 'border-gray-600 bg-gray-100 text-gray-700',
    colorClassName: 'text-gray-600',
    iconClassName: 'fr-icon-file-line',
    label: 'Autres',
    value: 'NONE'
  }
]

const declarationTypeFilterValues = declarationTypeFilterOptions.map(option => option.value)
const defaultFilters = {
  declarationCode: '',
  declarantName: '',
  dateFrom: '',
  dateTo: '',
  kinds: declarationTypeFilterValues,
  pointsToAssociateOnly: false
}

const MyDeclarationsList = ({initialEntries = [], initialMeta = {}, showDeclarant: showDeclarantFromProps}) => {
  const {user} = useAuth()
  const [entries, setEntries] = useState(initialEntries)
  const [pagination, setPagination] = useState(() => normalizeDeclarationFeedPagination(initialMeta?.pagination))
  const [loading, setLoading] = useState(false)
  const [paginationError, setPaginationError] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState(() => updateDeclarationFeedCursors([null], 0, pagination))
  const resultsRef = useRef(null)
  const requestRef = useRef(null)
  const isLoadingRef = useRef(false)
  const isMountedRef = useRef(true)
  const showDeclarant = typeof showDeclarantFromProps === 'boolean'
    ? showDeclarantFromProps
    : (initialMeta.declarantRole ?? user?.declarantRole) === 'COLLECTEUR'
  const showOtherKind = hasOtherDeclarations(initialMeta, initialEntries)
  const availableTypeOptions = declarationTypeFilterOptions.filter(option => option.value !== 'NONE' || showOtherKind)
  const selectedKindSet = new Set(filters.kinds)
  const hasSpreadsheetType = selectedKindSet.has('SPREADSHEET')
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilters)

  const loadPage = async ({nextFilters, cursor = null, index = 0, cursors = [null], limit = pagination.limit}) => {
    if (isLoadingRef.current) {
      return
    }

    const request = {nextFilters, cursor, index, cursors, limit}
    requestRef.current = request
    isLoadingRef.current = true
    setLoading(true)
    setPaginationError(null)
    setAppliedFilters(nextFilters)
    setPageIndex(index)
    setPageCursors(cursors)
    // Never show the previous page as the result of a new search or failed request.
    setEntries([])

    try {
      const actionResult = await getMyDeclarationFeedAction({
        ...nextFilters,
        cursor,
        includeCounts: false,
        includeMeta: false,
        limit
      })
      if (!isMountedRef.current) {
        return
      }

      const response = actionResult?.success ? actionResult.data : null
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(actionResult?.error || 'Le chargement des déclarations a échoué.')
      }

      const nextPagination = normalizeDeclarationFeedPagination(response.meta?.pagination, limit)
      if (nextPagination.hasNext && (!nextPagination.nextCursor || nextPagination.nextCursor === cursor)) {
        throw new Error('La pagination des déclarations ne peut pas continuer.')
      }

      setEntries(response.data)
      setPagination(nextPagination)
      setPageCursors(updateDeclarationFeedCursors(cursors, index, nextPagination))
      requestAnimationFrame(() => {
        resultsRef.current?.focus({preventScroll: true})
        resultsRef.current?.scrollIntoView({block: 'start'})
      })
    } catch (error) {
      if (isMountedRef.current) {
        setPaginationError(error.message || 'Le chargement des déclarations a échoué.')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateFilter = (name, value) => {
    setFilters(previous => ({...previous, [name]: value}))
  }

  const toggleKind = kind => {
    const visibleKinds = filters.kinds.filter(value => value !== 'NONE' || showOtherKind)
    let kinds = selectedKindSet.has(kind)
      ? visibleKinds.filter(value => value !== kind)
      : availableTypeOptions.map(option => option.value).filter(value => [...visibleKinds, kind].includes(value))
    if (kinds.length === availableTypeOptions.length) {
      kinds = declarationTypeFilterValues
    }
    setFilters(previous => ({
      ...previous,
      kinds,
      pointsToAssociateOnly: kinds.includes('SPREADSHEET') && previous.pointsToAssociateOnly
    }))
  }

  const applyFilters = event => {
    event.preventDefault()
    const nextFilters = {...filters, declarationCode: filters.declarationCode.trim(), declarantName: filters.declarantName.trim()}
    setFilters(nextFilters)
    if (paginationError || JSON.stringify(nextFilters) !== JSON.stringify(appliedFilters)) {
      loadPage({nextFilters})
    }
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    if (paginationError || JSON.stringify(appliedFilters) !== JSON.stringify(defaultFilters)) {
      loadPage({nextFilters: defaultFilters})
    }
  }

  const navigate = page => {
    const index = page - 1
    if (index !== pageIndex && index >= 0 && index < pageCursors.length) {
      loadPage({nextFilters: appliedFilters, cursor: pageCursors[index], index, cursors: pageCursors})
    }
  }
  const visiblePagination = {page: pageIndex + 1, pageSize: pagination.limit, total: null, totalPages: pageCursors.length}

  return (
    <div className='flex flex-col gap-3'>
      <form className='border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des déclarations' onSubmit={applyFilters}>
        <fieldset disabled={loading} className='m-0 min-w-0 border-0 p-0'>
          <legend className='sr-only'>Filtres des déclarations</legend>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            {hasActiveFilters && (
              <Button
                priority='secondary'
                size='small'
                iconId='fr-icon-refresh-line'
                type='button'
                onClick={resetFilters}
              >
                Réinitialiser
              </Button>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-x-4 gap-y-3 ${showDeclarant ? 'lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(25rem,1.25fr)]' : 'lg:grid-cols-[minmax(10rem,.75fr)_minmax(25rem,1.25fr)]'} lg:items-end`}>
            {showDeclarant && (
              <div className='fr-input-group fr-mb-0 min-w-0'>
                <label className='fr-label min-h-6' htmlFor='my-declarations-declarant-filter'>Déclarant concerné</label>
                <input
                  className='fr-input'
                  id='my-declarations-declarant-filter'
                  type='search'
                  value={filters.declarantName}
                  onChange={event => updateFilter('declarantName', event.target.value)}
                />
              </div>
            )}

            <div className='fr-input-group fr-mb-0 min-w-0'>
              <label className='fr-label min-h-6' htmlFor='my-declarations-number-filter'>Numéro</label>
              <input
                className='fr-input'
                id='my-declarations-number-filter'
                inputMode='numeric'
                value={filters.declarationCode}
                onChange={event => updateFilter('declarationCode', event.target.value)}
              />
            </div>

            <div className='min-w-0' role='group' aria-labelledby='my-declarations-period-filter-label'>
              <div className='fr-label fr-mb-1w min-h-6' id='my-declarations-period-filter-label'>Période concernée</div>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='flex min-w-0 items-center gap-2'>
                  <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='my-declarations-start-date'>Du</label>
                  <input
                    className='fr-input'
                    id='my-declarations-start-date'
                    type='date'
                    value={filters.dateFrom}
                    onChange={event => updateFilter('dateFrom', event.target.value)}
                  />
                </div>
                <div className='flex min-w-0 items-center gap-2'>
                  <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='my-declarations-end-date'>Au</label>
                  <input
                    className='fr-input'
                    id='my-declarations-end-date'
                    min={filters.dateFrom || undefined}
                    type='date'
                    value={filters.dateTo}
                    onChange={event => updateFilter('dateTo', event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start'>
            <div className='min-w-0' role='group' aria-labelledby='my-declaration-types-filter-label'>
              <div className='fr-label fr-mb-1w min-h-6' id='my-declaration-types-filter-label'>Types de déclaration</div>
              <div className='flex flex-wrap gap-2'>
                {availableTypeOptions.map(option => {
                  const checked = selectedKindSet.has(option.value)
                  return (
                    <label
                      key={option.value}
                      className={`inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-sm font-medium transition-colors ${checked ? option.checkedClassName : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                      htmlFor={`my-declaration-type-filter-${option.value}`}
                    >
                      <input
                        checked={checked}
                        className={`h-3.5 w-3.5 ${option.checkboxClassName}`}
                        id={`my-declaration-type-filter-${option.value}`}
                        type='checkbox'
                        onChange={() => toggleKind(option.value)}
                      />
                      <span
                        className={`${option.iconClassName} text-[0.66rem] ${checked ? option.colorClassName : 'text-gray-500'} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                        aria-hidden='true'
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {hasSpreadsheetType && (
              <div className='min-w-0 lg:justify-self-end lg:pt-7'>
                <div className='fr-checkbox-group fr-mb-0'>
                  <input
                    checked={filters.pointsToAssociateOnly}
                    id='my-declarations-points-to-associate-filter'
                    type='checkbox'
                    onChange={() => updateFilter('pointsToAssociateOnly', !filters.pointsToAssociateOnly)}
                  />
                  <label className='fr-label' htmlFor='my-declarations-points-to-associate-filter'>
                    Afficher uniquement les déclarations avec points à associer
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className='mt-3'>
            <Button type='submit' size='small' iconId='fr-icon-search-line'>Rechercher</Button>
          </div>
        </fieldset>
      </form>

      <div className='fr-mb-4w' aria-busy={loading}>
        <DeclarationResultsToolbar
          isLoading={loading}
          error={paginationError}
          itemsLength={entries.length}
          pagination={visiblePagination}
          pageSizeId='my-declarations-page-size'
          resultsRef={resultsRef}
          onPageChange={navigate}
          onPageSizeChange={limit => loadPage({nextFilters: appliedFilters, limit})}
        />

        {loading ? (
          <div className='border border-gray-200 bg-white p-5 text-center text-sm text-gray-700' aria-busy='true'>
            Chargement des déclarations…
          </div>
        ) : paginationError ? (
          <div className='flex flex-col gap-3'>
            <Alert severity='error' title='Déclarations indisponibles' description={paginationError} />
            <div>
              <Button priority='secondary' iconId='fr-icon-refresh-line' onClick={() => loadPage(requestRef.current)}>
                Réessayer
              </Button>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
            Aucune déclaration ne correspond à ces filtres.
          </div>
        ) : (
          <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
            <DeclarationSummaryListHeader showDeclarant={showDeclarant} />
            {entries.map(entry => (
              <DeclarationSummaryItem
                key={entry.id}
                preferUsageName
                declaration={entry.declaration}
                source={entry.source}
                url={entry.url}
                showDeclarant={showDeclarant}
              />
            ))}
          </div>
        )}

        <DeclarationsPagination
          className='fr-mt-3w'
          disabled={loading || Boolean(paginationError)}
          pagination={visiblePagination}
          onPageChange={navigate}
        />
      </div>
    </div>
  )
}

export default MyDeclarationsList
