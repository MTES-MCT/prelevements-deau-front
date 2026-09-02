'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import AgentListItem, {AgentListHeader} from '@/components/agents/agent-list-item.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import useSearchDraft from '@/hook/use-search-draft.js'
import {
  AGENT_ACCESS_STATUSES,
  AGENT_ACCOUNT_STATUSES,
  AGENTS_PAGE_SIZE_OPTIONS,
  buildAgentsPathname,
  getEffectiveAgentsSort
} from '@/lib/agent-search.js'
import {
  getAgentAccessStatusLabel,
  getAgentAccountStatusLabel
} from '@/lib/agents.js'
import {SMART_SEARCH_DEBOUNCE_MS} from '@/lib/search-timing.js'

const SORT_OPTIONS = [
  {value: 'NAME', label: 'Nom (A–Z)', order: 'ASC'},
  {value: 'ACTIVE_ZONES', label: 'Nombre de zones actives', order: 'DESC'},
  {value: 'CREATED_AT', label: 'Création récente', order: 'DESC'}
]

const ACCESS_STATUS_OPTIONS = Object.values(AGENT_ACCESS_STATUSES).map(value => ({
  value,
  label: getAgentAccessStatusLabel(value)
}))

function normalizeFacetItems(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(value?.options)) {
    return value.options
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value).map(([key, item]) => item && typeof item === 'object'
    ? {value: key, ...item}
    : {value: key, count: item})
}

function withFacetCounts(options, facet) {
  const counts = new Map(normalizeFacetItems(facet).map(item => [
    String(item.value ?? item.id ?? item.key),
    Number.isFinite(Number(item.count)) ? Number(item.count) : null
  ]))

  return options.map(option => ({
    ...option,
    content: counts.has(option.value) && counts.get(option.value) !== null
      ? `${option.label} (${counts.get(option.value)})`
      : option.label
  }))
}

function getZoneGroups(facet, selectedZoneIds) {
  const typeLabels = {
    REGION: 'Régions',
    DEPARTEMENT: 'Départements',
    SAGE: 'SAGE'
  }
  const typeOrder = ['REGION', 'DEPARTEMENT', 'SAGE', 'AUTRE']
  const items = normalizeFacetItems(facet).map(item => ({
    value: String(item.value ?? item.id ?? ''),
    label: item.label ?? item.name ?? item.code ?? String(item.value ?? item.id ?? ''),
    count: Number.isFinite(Number(item.count)) ? Number(item.count) : null,
    type: item.type ?? 'AUTRE'
  })).filter(item => item.value)
  const available = new Set(items.map(item => item.value))

  for (const zoneId of selectedZoneIds) {
    if (!available.has(zoneId)) {
      items.push({
        value: zoneId,
        label: zoneId,
        count: null,
        type: 'AUTRE'
      })
    }
  }

  return typeOrder.map(type => ({
    label: typeLabels[type] ?? 'Autres zones',
    options: items
      .filter(item => item.type === type)
      .sort((left, right) => left.label.localeCompare(right.label, 'fr'))
      .map(item => ({
        value: item.value,
        label: item.label,
        content: item.count === null ? item.label : `${item.label} (${item.count})`
      }))
  })).filter(group => group.options.length > 0)
}

function buildPaginationItems(page, totalPages) {
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter(candidate => candidate >= 1 && candidate <= totalPages)
    .sort((left, right) => left - right)
  const items = []

  for (const [index, candidate] of pages.entries()) {
    const previous = pages[index - 1]
    if (previous && candidate - previous > 1) {
      items.push(`ellipsis-${previous}-${candidate}`)
    }

    items.push(candidate)
  }

  return items
}

const AgentsPagination = ({currentPage, getPageHref, onNavigate, total, totalPages, className = ''}) => {
  const items = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  )

  if (total === 0 || totalPages <= 1) {
    return null
  }

  return (
    <nav aria-label='Pagination des agents' className={`flex justify-end ${className}`}>
      <div className='flex flex-wrap items-center justify-center gap-1'>
        <Button
          disabled={currentPage <= 1}
          priority='tertiary no outline'
          size='small'
          linkProps={currentPage <= 1 ? undefined : {
            href: getPageHref(currentPage - 1),
            scroll: false,
            onNavigate: event => onNavigate(event, getPageHref(currentPage - 1))
          }}
        >
          Précédent
        </Button>
        {items.map(item => {
          if (typeof item === 'string') {
            return <span key={item} className='inline-flex h-8 min-w-8 items-center justify-center text-sm text-gray-500'>…</span>
          }

          if (item === currentPage) {
            return <span key={item} aria-current='page' className='fr-btn fr-btn--sm pointer-events-none'>{item}</span>
          }

          return (
            <Button
              key={item}
              priority='tertiary no outline'
              size='small'
              linkProps={{
                href: getPageHref(item),
                scroll: false,
                onNavigate: event => onNavigate(event, getPageHref(item))
              }}
            >
              {item}
            </Button>
          )
        })}
        <Button
          disabled={currentPage >= totalPages}
          priority='tertiary no outline'
          size='small'
          linkProps={currentPage >= totalPages ? undefined : {
            href: getPageHref(currentPage + 1),
            scroll: false,
            onNavigate: event => onNavigate(event, getPageHref(currentPage + 1))
          }}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

const AgentsList = ({agents, facets = {}, filters, page, pageSize, total, totalPages}) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [filtersOpen, setFiltersOpen] = useState(
    () => filters.accountStatus !== AGENT_ACCOUNT_STATUSES.ACTIVE
      || filters.zoneIds.length > 0
      || filters.accessStatuses.length > 0
  )
  const {
    registerLocalNavigation,
    setValue: setQuery,
    value: query
  } = useSearchDraft(filters.query, 'query')
  const debouncedQuery = useDebouncedValue(query, SMART_SEARCH_DEBOUNCE_MS)
  const previousFilterCount = useRef(0)
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const currentHref = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname
  const activeFilterCount = (filters.accountStatus === AGENT_ACCOUNT_STATUSES.ACTIVE ? 0 : 1)
    + filters.zoneIds.length
    + filters.accessStatuses.length
  const zoneGroups = useMemo(
    () => getZoneGroups(facets.zones, filters.zoneIds),
    [facets.zones, filters.zoneIds]
  )
  const accessOptions = useMemo(
    () => withFacetCounts(ACCESS_STATUS_OPTIONS, facets.accessStatuses),
    [facets.accessStatuses]
  )
  const selectedSort = getEffectiveAgentsSort(filters)

  const navigateTo = useCallback(href => {
    if (href !== currentHref) {
      startTransition(() => router.replace(href, {scroll: false}))
    }
  }, [currentHref, router])

  const navigateToPage = useCallback((event, href) => {
    if (href !== currentHref) {
      event.preventDefault()
      startTransition(() => router.push(href, {scroll: false}))
    }
  }, [currentHref, router])

  const replaceFilters = useCallback(values => {
    registerLocalNavigation(values.query === null ? '' : (values.query ?? query).trim())
    navigateTo(buildAgentsPathname(pathname, searchParams, {
      query: query.trim(),
      ...values,
      page: null
    }))
  }, [navigateTo, pathname, query, registerLocalNavigation, searchParams])

  useEffect(() => {
    const nextQuery = debouncedQuery.trim()
    if (nextQuery !== filters.query) {
      registerLocalNavigation(nextQuery)
      navigateTo(buildAgentsPathname(pathname, searchParams, {
        query: nextQuery,
        page: null
      }))
    }
  }, [debouncedQuery, filters.query, navigateTo, pathname, registerLocalNavigation, searchParams])

  useEffect(() => {
    if (previousFilterCount.current === 0 && activeFilterCount > 0) {
      setFiltersOpen(true)
    }

    previousFilterCount.current = activeFilterCount
  }, [activeFilterCount])

  const getPageHref = nextPage => buildAgentsPathname(pathname, searchParams, {
    query: query.trim(),
    page: Math.max(1, nextPage)
  })
  const firstItem = total === 0 ? 0 : Math.min(((currentPage - 1) * pageSize) + 1, total)
  const lastItem = Math.min(currentPage * pageSize, total)

  return (
    <div className='flex w-full flex-col gap-4'>
      <section className='border border-gray-200 bg-white px-4 py-4' aria-label='Recherche et filtres des agents'>
        <div className='grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(18rem,1fr)_auto] sm:items-end'>
          <div className='fr-input-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='agents-search'>Recherche</label>
            <input
              autoFocus
              className='fr-input'
              id='agents-search'
              placeholder='Nom, email, fonction, téléphone ou zone'
              type='search'
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
          <button
            aria-controls='agents-filters'
            aria-expanded={filtersOpen}
            className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 border px-4 text-sm font-medium sm:w-auto ${activeFilterCount > 0 ? 'border-[#000091] bg-[#ececfe] text-[#000091]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            type='button'
            onClick={() => setFiltersOpen(open => !open)}
          >
            <span aria-hidden='true' className='fr-icon-filter-line text-sm' />
            Filtres
            {activeFilterCount > 0 && (
              <span className='inline-flex h-5 min-w-5 items-center justify-center bg-[#000091] px-1 text-[0.6875rem] font-bold text-white'>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <section
          className='mt-4 border-t border-gray-200 pt-4'
          hidden={!filtersOpen}
          id='agents-filters'
          aria-labelledby='agents-filters-title'
        >
          <div className='mb-3 flex items-center justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0' id='agents-filters-title'>Filtres avancés</h2>
            {activeFilterCount > 0 && (
              <button
                className='text-sm font-medium text-[#000091] underline'
                type='button'
                onClick={() => replaceFilters({
                  accountStatus: AGENT_ACCOUNT_STATUSES.ACTIVE,
                  accessStatuses: [],
                  zoneIds: []
                })}
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end'>
            <div className='fr-select-group fr-mb-0'>
              <label className='fr-label' htmlFor='agents-account-status'>État du compte</label>
              <select
                className='fr-select'
                id='agents-account-status'
                value={filters.accountStatus}
                onChange={event => replaceFilters({accountStatus: event.target.value})}
              >
                {Object.values(AGENT_ACCOUNT_STATUSES).map(status => (
                  <option key={status} value={status}>
                    {status === 'ALL' ? 'Tous les états' : getAgentAccountStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <GroupedMultiselect
              searchable
              id='agents-zones'
              label='Zones'
              placeholder='Toutes les zones'
              options={zoneGroups}
              value={filters.zoneIds}
              onChange={zoneIds => replaceFilters({zoneIds})}
            />
            <GroupedMultiselect
              id='agents-access-statuses'
              label='État des accès'
              placeholder='Tous les accès'
              options={accessOptions}
              value={filters.accessStatuses}
              onChange={accessStatuses => replaceFilters({accessStatuses})}
            />
          </div>
        </section>
      </section>

      <div aria-busy={isPending} className='fr-mt-1w'>
        {total > 0 && (
          <div className='fr-mb-2w flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <p aria-live='polite' className='fr-text--sm fr-mb-0 font-medium text-gray-900' role='status'>
              {firstItem}-{lastItem} sur {total} agent{total > 1 ? 's' : ''}
              {isPending && <span className='ml-2 text-gray-600'>Actualisation…</span>}
            </p>
            <div className='flex flex-wrap items-center justify-end gap-3'>
              <label className='fr-label fr-mb-0 text-xs' htmlFor='agents-page-size'>Par page</label>
              <select
                className='h-8 w-16 border border-gray-300 bg-white px-2 text-sm'
                id='agents-page-size'
                value={pageSize}
                onChange={event => replaceFilters({pageSize: Number.parseInt(event.target.value, 10)})}
              >
                {AGENTS_PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <AgentsPagination
                currentPage={currentPage}
                getPageHref={getPageHref}
                total={total}
                totalPages={totalPages}
                onNavigate={navigateToPage}
              />
            </div>
          </div>
        )}

        {agents.length > 0 && (
          <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
            <div className='flex justify-end border-b border-gray-200 bg-[var(--background-alt-grey)] px-3 py-2'>
              <div className='fr-select-group fr-mb-0 flex items-center gap-2'>
                <label className='fr-label fr-mb-0 text-xs font-semibold' htmlFor='agents-sort'>Trier par</label>
                <select
                  className='fr-select !mt-0 min-w-64 text-sm'
                  id='agents-sort'
                  value={selectedSort}
                  onChange={event => {
                    if (event.target.value === 'RELEVANCE') {
                      replaceFilters({sort: 'RELEVANCE', order: 'ASC'})
                      return
                    }

                    const option = SORT_OPTIONS.find(item => item.value === event.target.value)
                    replaceFilters({sort: option.value, order: option.order})
                  }}
                >
                  {filters.query && <option value='RELEVANCE'>Pertinence</option>}
                  {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            <AgentListHeader />
            {agents.map(agent => <AgentListItem key={agent.id} agent={agent} />)}
          </div>
        )}

        {total === 0 && (
          <div aria-live='polite' className='border border-gray-200 bg-white px-4 py-6' role='status'>
            <p className='fr-mb-0'><i>Aucun agent ne correspond à ces filtres</i></p>
          </div>
        )}

        <AgentsPagination
          className='fr-mt-3w'
          currentPage={currentPage}
          getPageHref={getPageHref}
          total={total}
          totalPages={totalPages}
          onNavigate={navigateToPage}
        />
      </div>
    </div>
  )
}

export default AgentsList
