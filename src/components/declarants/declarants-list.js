'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import Declarant from '@/components/declarants/declarant.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import {
  DECLARANTS_MULTI_FILTER_KEYS,
  DECLARANTS_PAGE_SIZE_OPTIONS,
  DECLARANTS_SCALAR_FILTER_KEYS,
  buildDeclarantsPathname
} from '@/lib/declarant-search.js'

const FILTER_CONFIGS = [
  {
    name: 'role',
    label: 'Rôle',
    emptyLabel: 'Tous les rôles',
    facetKeys: ['roles'],
    options: [
      {value: 'PRELEVEUR', label: 'Préleveurs'},
      {value: 'COLLECTEUR', label: 'Collecteurs'}
    ]
  },
  {
    name: 'preleveurType',
    label: 'Type métier',
    emptyLabel: 'Tous les types',
    facetKeys: ['preleveurTypes'],
    options: [
      {value: 'ICPE', label: 'ICPE'},
      {value: 'IRRIGANT', label: 'Irrigant'},
      {value: 'GESTIONNAIRE_AEP', label: 'Gestionnaire AEP'},
      {value: 'AUTRE', label: 'Autre'}
    ]
  },
  {
    name: 'declarantType',
    label: 'Personne',
    emptyLabel: 'Tous les profils',
    facetKeys: ['declarantTypes'],
    options: [
      {value: 'NATURAL_PERSON', label: 'Personne physique'},
      {value: 'LEGAL_PERSON', label: 'Personne morale'}
    ]
  },
  {
    name: 'emailStatus',
    label: 'Email',
    emptyLabel: 'Tous les emails',
    facetKeys: ['emailStatuses'],
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  },
  {
    name: 'zoneIds',
    label: 'Zone',
    emptyLabel: 'Toutes les zones',
    facetKeys: ['zones'],
    multiple: true
  },
  {
    name: 'usageCodes',
    label: 'Usage',
    emptyLabel: 'Tous les usages',
    facetKeys: ['usages'],
    multiple: true
  },
  {
    name: 'waterBodyTypes',
    label: 'Milieu',
    emptyLabel: 'Tous les milieux',
    facetKeys: ['waterBodyTypes'],
    multiple: true,
    options: [
      {value: 'SUPERFICIELLE', label: 'Eau superficielle'},
      {value: 'SOUTERRAIN', label: 'Eau souterraine'},
      {value: 'TRANSITION', label: 'Eau de transition'}
    ]
  },
  {
    name: 'exploitationStatuses',
    label: 'Statut exploitation',
    emptyLabel: 'Tous les statuts',
    facetKeys: ['exploitationStatuses'],
    multiple: true,
    options: [
      {value: 'EN_ACTIVITE', label: 'En activité'},
      {value: 'TERMINEE', label: 'Terminée'},
      {value: 'ABANDONNEE', label: 'Abandonnée'},
      {value: 'NON_RENSEIGNE', label: 'Non renseigné'}
    ]
  },
  {
    name: 'collecteurStatus',
    label: 'Rattachement collecteur',
    emptyLabel: 'Tous les rattachements',
    facetKeys: ['collecteurStatuses'],
    options: [
      {value: 'WITH_COLLECTEUR', label: 'Avec collecteur'},
      {value: 'WITHOUT_COLLECTEUR', label: 'Sans collecteur'}
    ]
  },
  {
    name: 'connectorStatus',
    label: 'Connecteur',
    emptyLabel: 'Tous les connecteurs',
    facetKeys: ['connectorStatuses'],
    options: [
      {value: 'WITH_CONNECTOR', label: 'Configuré'},
      {value: 'WITHOUT_CONNECTOR', label: 'Non configuré'}
    ]
  },
  {
    name: 'activityRange',
    label: 'Dernière déclaration',
    emptyLabel: 'Toute activité',
    facetKeys: ['activityRanges'],
    options: [
      {value: 'LT_30_DAYS', label: 'Moins de 30 jours'},
      {value: 'DAYS_30_90', label: '30 à 90 jours'},
      {value: 'DAYS_91_365', label: '91 jours à 1 an'},
      {value: 'GT_365_DAYS', label: 'Plus d’un an'},
      {value: 'NEVER', label: 'Aucune déclaration'}
    ]
  }
]

const SORT_OPTIONS = [
  {value: 'RELEVANCE', label: 'Pertinence'},
  {value: 'NAME', label: 'Nom'},
  {value: 'LAST_DECLARATION', label: 'Dernière déclaration'}
]

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

  return Object.entries(value).map(([key, item]) => {
    if (item && typeof item === 'object') {
      return {value: key, ...item}
    }

    return {value: key, count: item}
  })
}

function getFacetOptions(facets, config, selectedValues = []) {
  const staticOptions = config.options || []
  const staticByValue = new Map(staticOptions.map(option => [option.value, option]))
  const facetKey = [config.name, ...(config.facetKeys || [])]
    .find(key => facets && Object.hasOwn(facets, key))
  const facetItems = facetKey ? normalizeFacetItems(facets[facetKey]) : []

  if (!facetKey) {
    return staticOptions
  }

  const options = facetItems.map(item => {
    const value = String(item?.value ?? item?.id ?? item?.code ?? item?.key ?? '')
    const fallback = staticByValue.get(value)

    return {
      value,
      label: item?.label ?? item?.name ?? fallback?.label ?? value,
      count: Number.isFinite(Number(item?.count)) ? Number(item.count) : null
    }
  }).filter(option => option.value)
  const available = new Set(options.map(option => option.value))

  for (const selectedValue of selectedValues) {
    if (!available.has(selectedValue)) {
      const fallback = staticByValue.get(selectedValue)
      options.push({
        value: selectedValue,
        label: fallback?.label ?? selectedValue,
        count: null
      })
    }
  }

  return options
}

function getFilterValues(filters, config) {
  const value = filters[config.name]

  if (config.multiple) {
    if (Array.isArray(value)) {
      return value
    }

    return value ? [value] : []
  }

  return value ? [value] : []
}

function hasFilterValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

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

const DeclarantFilterSelect = ({config, facets, filters, onChange}) => {
  const selectedValues = getFilterValues(filters, config)
  const options = getFacetOptions(facets, config, selectedValues)
  const hasFacet = [config.name, ...(config.facetKeys || [])]
    .some(key => facets && Object.hasOwn(facets, key))

  if (options.length === 0 || (hasFacet && options.length <= 1 && selectedValues.length === 0)) {
    return null
  }

  const value = selectedValues[0] || ''
  const id = `declarants-${config.name}-filter`

  return (
    <div className='fr-select-group fr-mb-0 min-w-0'>
      <label className='fr-label min-h-6' htmlFor={id}>{config.label}</label>
      <select
        className='fr-select'
        id={id}
        value={value}
        onChange={event => {
          const nextValue = config.multiple && event.target.value
            ? [event.target.value]
            : event.target.value

          onChange({[config.name]: nextValue})
        }}
      >
        <option value=''>{config.emptyLabel || 'Tous'}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}{option.count === null || option.count === undefined ? '' : ` (${option.count})`}
          </option>
        ))}
      </select>
    </div>
  )
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
  itemLabel = 'déclarant',
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
          {firstItem}-{lastItem} sur {total} {itemLabel}{total > 1 ? 's' : ''}
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
  facets = {},
  filters,
  listKind = 'declarants',
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
  const isPreleveursList = listKind === 'preleveurs'
  const filterConfigs = useMemo(
    () => FILTER_CONFIGS.filter(config => {
      if (!isPreleveursList) {
        return true
      }

      return !['role', 'collecteurStatus'].includes(config.name)
    }),
    [isPreleveursList]
  )
  const hasActiveFilters = Boolean(filters.query || filters.sort
    || filterConfigs.some(config => hasFilterValue(filters[config.name])))
  const selectedSort = filters.sort || (filters.query ? 'RELEVANCE' : 'NAME')

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
    const resetValues = {
      query: null,
      sort: null
    }

    for (const key of [...DECLARANTS_SCALAR_FILTER_KEYS, ...DECLARANTS_MULTI_FILTER_KEYS]) {
      resetValues[key] = null
    }

    replaceFilters(resetValues)
  }

  const normalizedCounts = {
    total: Number(counts?.total ?? total ?? 0),
    preleveurs: Number(counts?.preleveurs ?? (isPreleveursList ? total : 0) ?? 0),
    collecteurs: Number(counts?.collecteurs ?? 0),
    withoutEmail: Number(counts?.withoutEmail ?? 0)
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className={`grid grid-cols-1 gap-3 ${isPreleveursList ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-1v'>
            {pluralize(normalizedCounts.total, isPreleveursList ? 'préleveur' : 'déclarant')}
          </p>
          <p className='fr-text--sm fr-mb-0'>Total visible dans votre périmètre</p>
        </div>
        {!isPreleveursList && (
          <div className='border border-gray-200 bg-white px-4 py-3'>
            <p className='fr-text--lead fr-mb-1v'>{pluralize(normalizedCounts.preleveurs, 'préleveur')}</p>
            <p className='fr-text--sm fr-mb-0'>{pluralize(normalizedCounts.collecteurs, 'collecteur')}</p>
          </div>
        )}
        <div className='border border-gray-200 bg-white px-4 py-3'>
          <p className='fr-text--lead fr-mb-0'>
            {pluralize(
              normalizedCounts.withoutEmail,
              `${isPreleveursList ? 'préleveur' : 'déclarant'} sans email`,
              `${isPreleveursList ? 'préleveurs' : 'déclarants'} sans email`
            )}
          </p>
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

        <div className='grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end'>
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
            <label className='fr-label min-h-6' htmlFor='declarants-sort'>Trier par</label>
            <select
              className='fr-select'
              id='declarants-sort'
              value={selectedSort}
              onChange={event => replaceFilters({sort: event.target.value})}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {filterConfigs.map(config => (
            <DeclarantFilterSelect
              key={config.name}
              config={config}
              facets={facets}
              filters={filters}
              onChange={replaceFilters}
            />
          ))}
        </div>
      </section>

      <div className='fr-mt-1w'>
        <ResultsToolbar
          currentPage={currentPage}
          getPageHref={getPageHref}
          itemLabel={isPreleveursList ? 'préleveur' : 'déclarant'}
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
