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

import Declarant, {DeclarantSummaryListHeader} from '@/components/declarants/declarant.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import useSearchDraft from '@/hook/use-search-draft.js'
import {
  getActiveDeclarantFilterChips,
  getActiveDeclarantFilterValueCount,
  getDeclarantFilterRemoval,
  getFacetedDeclarantFilterConfigs
} from '@/lib/declarant-filter-chips.js'
import {
  DECLARANTS_PAGE_SIZE_OPTIONS,
  buildDeclarantsPathname,
  getEffectiveDeclarantsSort
} from '@/lib/declarant-search.js'
import {SMART_SEARCH_DEBOUNCE_MS} from '@/lib/search-timing.js'

const FILTER_CONFIGS = [
  {
    name: 'role',
    label: 'Catégorie de déclarant',
    emptyLabel: 'Tous les rôles',
    facetKeys: ['roles'],
    section: 'profile',
    options: [
      {value: 'PRELEVEUR', label: 'Préleveurs'},
      {value: 'COLLECTEUR', label: 'Collecteurs'}
    ]
  },
  {
    name: 'preleveurType',
    label: 'Type de préleveur',
    emptyLabel: 'Tous les types',
    facetKeys: ['preleveurTypes'],
    section: 'profile',
    options: [
      {value: 'ICPE', label: 'ICPE'},
      {value: 'IRRIGANT', label: 'Irrigant'},
      {value: 'GESTIONNAIRE_AEP', label: 'Gestionnaire AEP'},
      {value: 'AUTRE', label: 'Autre'}
    ]
  },
  {
    name: 'declarantType',
    label: 'Nature juridique',
    emptyLabel: 'Toutes les natures',
    facetKeys: ['declarantTypes'],
    section: 'profile',
    options: [
      {value: 'NATURAL_PERSON', label: 'Personne physique'},
      {value: 'LEGAL_PERSON', label: 'Personne morale'}
    ]
  },
  {
    name: 'emailStatus',
    label: 'Contact email',
    emptyLabel: 'Avec ou sans email',
    facetKeys: ['emailStatuses'],
    section: 'profile',
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  },
  {
    name: 'activityRange',
    label: 'Dernière déclaration',
    emptyLabel: 'Toute activité',
    facetKeys: ['activityRanges'],
    section: 'activity',
    options: [
      {value: 'LT_30_DAYS', label: 'Moins de 30 jours'},
      {value: 'DAYS_30_90', label: '30 à 90 jours'},
      {value: 'DAYS_91_365', label: '91 jours à 1 an'},
      {value: 'GT_365_DAYS', label: 'Plus d’un an'},
      {value: 'NEVER', label: 'Aucune déclaration'}
    ]
  },
  {
    name: 'connectorStatus',
    label: 'Connecteur',
    emptyLabel: 'Avec ou sans connecteur',
    facetKeys: ['connectorStatuses'],
    section: 'activity',
    options: [
      {value: 'WITH_CONNECTOR', label: 'Connecteur configuré'},
      {value: 'WITHOUT_CONNECTOR', label: 'Sans connecteur'}
    ]
  },
  {
    name: 'zoneIds',
    label: 'Zone de gestion',
    emptyLabel: 'Toutes les zones',
    facetKeys: ['zones'],
    multiple: true,
    section: 'exploitations'
  },
  {
    name: 'usageCodes',
    label: 'Usage de l’eau',
    emptyLabel: 'Tous les usages',
    facetKeys: ['usages'],
    multiple: true,
    section: 'exploitations'
  },
  {
    name: 'waterBodyTypes',
    label: 'Milieu des points',
    emptyLabel: 'Tous les milieux',
    facetKeys: ['waterBodyTypes'],
    multiple: true,
    section: 'exploitations',
    options: [
      {value: 'SUPERFICIELLE', label: 'Eau superficielle'},
      {value: 'SOUTERRAIN', label: 'Eau souterraine'},
      {value: 'TRANSITION', label: 'Eau de transition'}
    ]
  },
  {
    name: 'exploitationStatuses',
    label: 'État des points',
    emptyLabel: 'Tous les états',
    facetKeys: ['exploitationStatuses'],
    multiple: true,
    section: 'exploitations',
    options: [
      {value: 'EN_ACTIVITE', label: 'En activité'},
      {value: 'TERMINEE', label: 'Terminée'},
      {value: 'ABANDONNEE', label: 'Abandonnée'},
      {value: 'NON_RENSEIGNE', label: 'Non renseigné'}
    ]
  },
  {
    name: 'collecteurStatus',
    label: 'Suivi par un collecteur',
    emptyLabel: 'Avec ou sans collecteur',
    facetKeys: ['collecteurStatuses'],
    section: 'exploitations',
    options: [
      {value: 'WITH_COLLECTEUR', label: 'Avec collecteur'},
      {value: 'WITHOUT_COLLECTEUR', label: 'Sans collecteur'}
    ]
  }
]

const FILTER_SECTIONS = [
  {
    id: 'profile',
    label: 'Profil et coordonnées',
    description: 'Catégorie, type de préleveur et disponibilité du contact.'
  },
  {
    id: 'activity',
    label: 'Activité déclarative',
    description: 'Récence des déclarations et connexion automatique.'
  },
  {
    id: 'exploitations',
    label: 'Périmètre et points',
    description: 'Zone, usages, milieu et organisation des points.'
  }
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
    return []
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

function getDeclarantId(declarant) {
  return declarant.id || declarant.userId || declarant.user?.id
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

const DeclarantFilterSelect = ({config, facets, filters, onChange, options: providedOptions}) => {
  const selectedValues = getFilterValues(filters, config)
  const options = providedOptions || getFacetOptions(facets, config, selectedValues)
  const hasFacet = [config.name, ...(config.facetKeys || [])]
    .some(key => facets && Object.hasOwn(facets, key))

  if (options.length === 0 || (hasFacet && options.length <= 1 && selectedValues.length === 0)) {
    return null
  }

  const value = selectedValues[0] || ''
  const id = `declarants-${config.name}-filter`

  if (config.multiple) {
    return (
      <div className='min-w-0'>
        <GroupedMultiselect
          searchable={options.length > 8}
          id={id}
          label={config.label}
          placeholder={config.emptyLabel || 'Tous'}
          value={selectedValues}
          options={options.map(option => ({
            value: option.value,
            label: option.label,
            content: option.count === null || option.count === undefined
              ? option.label
              : `${option.label} (${option.count})`
          }))}
          onChange={values => onChange({[config.name]: values})}
        />
      </div>
    )
  }

  return (
    <div className='fr-select-group fr-mb-0 min-w-0'>
      <label className='fr-label min-h-6' htmlFor={id}>{config.label}</label>
      <select
        className='fr-select'
        id={id}
        value={value}
        onChange={event => {
          onChange({[config.name]: event.target.value})
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

const ResultsSortControl = ({hasSearchQuery, selectedSort, onSortChange}) => {
  const options = [
    ...(hasSearchQuery ? [{value: 'RELEVANCE', label: 'Pertinence'}] : []),
    {value: 'NAME', label: 'Nom (A–Z)'},
    {value: 'LAST_DECLARATION', label: 'Dernière déclaration (récente d’abord)'}
  ]

  return (
    <div className='flex justify-end border-b border-gray-200 px-3 py-2' style={{backgroundColor: 'var(--background-alt-grey)'}}>
      <div className='fr-select-group fr-mb-0 flex w-full items-center justify-end gap-2 sm:w-auto'>
        <label className='fr-label fr-mb-0 shrink-0 text-xs font-semibold' htmlFor='declarants-results-sort'>
          Trier par
        </label>
        <select
          className='fr-select !mt-0 min-w-0 max-w-80 text-sm sm:min-w-64'
          id='declarants-results-sort'
          value={selectedSort}
          onChange={event => onSortChange(event.target.value)}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

const DeclarantsPagination = ({
  className = '',
  currentPage,
  getPageHref,
  onNavigate,
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

  const previousPageHref = getPageHref(currentPage - 1)
  const nextPageHref = getPageHref(currentPage + 1)

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
          linkProps={currentPage <= 1
            ? undefined
            : {
              href: previousPageHref,
              scroll: false,
              onNavigate: event => onNavigate(event, previousPageHref)
            }}
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

          if (item === currentPage) {
            return (
              <span
                key={item}
                aria-current='page'
                className='fr-btn fr-btn--sm pointer-events-none'
              >
                {item}
              </span>
            )
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
          linkProps={currentPage >= totalPages
            ? undefined
            : {
              href: nextPageHref,
              scroll: false,
              onNavigate: event => onNavigate(event, nextPageHref)
            }}
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
  isLoading,
  onNavigate,
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
    <div className='fr-mb-2w'>
      <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
        <div
          aria-live='polite'
          className='flex min-h-8 flex-wrap items-center gap-3'
          role='status'
        >
          <p className='fr-text--sm fr-mb-0 font-medium text-gray-900'>
            {firstItem}-{lastItem} sur {total} {itemLabel}{total > 1 ? 's' : ''}
          </p>
          {isLoading && (
            <span
              className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-600'
            >
              <span
                aria-hidden='true'
                className='fr-icon-refresh-line animate-spin text-[#000091] [&::after]:![--icon-size:0.75rem] [&::before]:![--icon-size:0.75rem]'
              />
              <span>Actualisation…</span>
            </span>
          )}
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end'>
          <PageSizeSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
          <DeclarantsPagination
            currentPage={currentPage}
            getPageHref={getPageHref}
            total={total}
            totalPages={totalPages}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  )
}

const DeclarantsList = ({
  basePath = '/declarants',
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
  const searchParamsKey = searchParams.toString()
  const [isPending, startTransition] = useTransition()
  const {
    registerLocalNavigation: registerLocalSearchNavigation,
    setValue: setQuery,
    value: query
  } = useSearchDraft(filters.query, 'query')
  const debouncedQuery = useDebouncedValue(query, SMART_SEARCH_DEBOUNCE_MS)
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
  const facetedFilterConfigs = useMemo(
    () => getFacetedDeclarantFilterConfigs(filterConfigs, facets),
    [facets, filterConfigs]
  )
  const filterSections = useMemo(
    () => FILTER_SECTIONS.map(section => ({
      ...section,
      filters: facetedFilterConfigs.filter(config => config.section === section.id)
    })).filter(section => section.filters.length > 0),
    [facetedFilterConfigs]
  )
  const filterOptionsByName = useMemo(
    () => Object.fromEntries(facetedFilterConfigs.map(config => [
      config.name,
      getFacetOptions(facets, config, getFilterValues(filters, config))
    ])),
    [facetedFilterConfigs, facets, filters]
  )
  const activeAdvancedFilterCount = useMemo(
    () => getActiveDeclarantFilterValueCount(filters, facetedFilterConfigs),
    [facetedFilterConfigs, filters]
  )
  const activeFilterChips = useMemo(
    () => getActiveDeclarantFilterChips({
      filterConfigs: facetedFilterConfigs,
      filters,
      optionsByFilter: filterOptionsByName
    }),
    [facetedFilterConfigs, filterOptionsByName, filters]
  )
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(
    () => activeAdvancedFilterCount > 0
  )
  const previousActiveFilterCount = useRef(activeAdvancedFilterCount)
  const hasSearchQuery = Boolean(filters.query?.trim())
  const selectedSort = getEffectiveDeclarantsSort(filters)
  const currentHref = searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname

  const navigateTo = useCallback(href => {
    if (href === currentHref) {
      return
    }

    startTransition(() => {
      router.replace(href, {scroll: false})
    })
  }, [currentHref, router])

  const navigateToPage = useCallback((event, href) => {
    if (href === currentHref) {
      return
    }

    event.preventDefault()
    startTransition(() => {
      router.push(href, {scroll: false})
    })
  }, [currentHref, router])

  useEffect(() => {
    const previousCount = previousActiveFilterCount.current
    previousActiveFilterCount.current = activeAdvancedFilterCount

    if (previousCount === 0 && activeAdvancedFilterCount > 0) {
      setAdvancedFiltersOpen(true)
    }
  }, [activeAdvancedFilterCount])

  useEffect(() => {
    const nextQuery = debouncedQuery.trim()

    if (nextQuery === filters.query) {
      return
    }

    registerLocalSearchNavigation(nextQuery)
    navigateTo(buildDeclarantsPathname(pathname, searchParams, {
      query: nextQuery,
      page: null
    }))
  }, [
    debouncedQuery,
    filters.query,
    pathname,
    registerLocalSearchNavigation,
    navigateTo,
    searchParams
  ])

  const replaceFilters = values => {
    registerLocalSearchNavigation(values.query === null ? '' : (values.query ?? query).trim())
    navigateTo(buildDeclarantsPathname(pathname, searchParams, {
      query: query.trim(),
      ...values,
      page: null
    }))
  }

  const getPageHref = nextPage => buildDeclarantsPathname(pathname, searchParams, {
    query: query.trim(),
    page: Math.max(1, nextPage)
  })
  const handlePageSizeChange = nextPageSize => replaceFilters({pageSize: nextPageSize})

  const resetAdvancedFilters = () => {
    const resetValues = {}

    for (const config of facetedFilterConfigs) {
      resetValues[config.name] = null
    }

    replaceFilters(resetValues)
  }

  const removeActiveFilter = chip => {
    replaceFilters(getDeclarantFilterRemoval(filters, chip))
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      <section className='border border-gray-200 bg-white px-4 py-4' aria-label='Recherche et filtres des déclarants'>
        <div className='grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(18rem,1fr)_auto] sm:items-end'>
          <div className='fr-input-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='declarants-search-filter'>Recherche</label>
            <input
              autoFocus
              className='fr-input'
              id='declarants-search-filter'
              placeholder='Entreprise, nom, email, ville ou point de prélèvement'
              type='search'
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>

          <button
            aria-controls='declarants-advanced-filters'
            aria-expanded={advancedFiltersOpen}
            className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091] sm:w-auto ${activeAdvancedFilterCount > 0 ? 'border-[#000091] bg-[#ececfe] text-[#000091]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            type='button'
            onClick={() => setAdvancedFiltersOpen(open => !open)}
          >
            <span aria-hidden='true' className='fr-icon-filter-line text-sm' />
            <span>Filtres</span>
            {activeAdvancedFilterCount > 0 && (
              <span className='inline-flex h-5 min-w-5 items-center justify-center bg-[#000091] px-1 text-[0.6875rem] font-bold text-white'>
                {activeAdvancedFilterCount}
              </span>
            )}
            <span
              aria-hidden='true'
              className={`${advancedFiltersOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} text-xs`}
            />
          </button>
        </div>

        {activeFilterChips.length > 0 && (
          <div className='mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:items-start sm:justify-between'>
            <ul className='m-0 flex min-w-0 flex-wrap gap-2 p-0' aria-label='Filtres actifs'>
              {activeFilterChips.map(chip => (
                <li key={chip.id} className='min-w-0 list-none'>
                  <span className='inline-flex max-w-full items-center gap-1 rounded-2xl bg-[#ececfe] py-1 pl-3 pr-1 text-xs font-medium text-[#000091]'>
                    <span className='min-w-0 break-words'>{chip.label}</span>
                    <button
                      aria-label={`Retirer le filtre ${chip.label}`}
                      className='inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[#cacafb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#000091]'
                      type='button'
                      onClick={() => removeActiveFilter(chip)}
                    >
                      <span aria-hidden='true' className='fr-icon-close-line text-xs' />
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <button
              aria-label='Réinitialiser les filtres avancés'
              className='shrink-0 self-start text-sm font-medium text-[#000091] underline decoration-1 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091]'
              type='button'
              onClick={resetAdvancedFilters}
            >
              Réinitialiser
            </button>
          </div>
        )}

        <section
          aria-labelledby='declarants-advanced-filters-title'
          className='mt-4 border-t border-gray-200 pt-4'
          hidden={!advancedFiltersOpen}
          id='declarants-advanced-filters'
        >
          <div className='mb-3 flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0' id='declarants-advanced-filters-title'>Filtres avancés</h2>
            <p className='fr-text--xs fr-mb-0 text-gray-600'>
              Les nombres indiquent les résultats disponibles dans votre périmètre.
            </p>
          </div>

          <div className='flex flex-col gap-5'>
            {filterSections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={sectionIndex > 0 ? 'border-t border-gray-200 pt-4' : ''}
              >
                <fieldset className='m-0 min-w-0 border-0 p-0'>
                  <legend className='fr-text--sm fr-mb-0 font-bold text-gray-900'>{section.label}</legend>
                  <p className='fr-text--xs fr-mb-2v mt-1 text-gray-600'>{section.description}</p>
                  <div className='grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end'>
                    {section.filters.map(config => (
                      <DeclarantFilterSelect
                        key={config.name}
                        config={config}
                        facets={facets}
                        filters={filters}
                        options={filterOptionsByName[config.name]}
                        onChange={replaceFilters}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>
            ))}
          </div>
        </section>
      </section>

      <div className='fr-mt-1w' aria-busy={isPending}>
        <ResultsToolbar
          currentPage={currentPage}
          getPageHref={getPageHref}
          isLoading={isPending}
          itemLabel={isPreleveursList ? 'préleveur' : 'déclarant'}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onNavigate={navigateToPage}
          onPageSizeChange={handlePageSizeChange}
        />

        {declarants.length > 0 && (
          <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
            <ResultsSortControl
              hasSearchQuery={hasSearchQuery}
              selectedSort={selectedSort}
              onSortChange={sort => replaceFilters({
                order: sort === 'LAST_DECLARATION' ? 'DESC' : null,
                sort
              })}
            />
            <DeclarantSummaryListHeader showRole={!isPreleveursList} />
            {declarants.map(declarant => (
              <Declarant
                key={getDeclarantId(declarant)}
                basePath={basePath}
                declarant={declarant}
                showLastDeclaration={selectedSort === 'LAST_DECLARATION'}
                showRole={!isPreleveursList}
                trustedCollectorScope={isPreleveursList}
              />
            ))}
          </div>
        )}

        {total === 0 && (
          <div
            aria-live='polite'
            className='border border-gray-200 bg-white px-4 py-6'
            role='status'
          >
            <p className='fr-mb-0'>
              <i>Aucun {isPreleveursList ? 'préleveur' : 'déclarant'} ne correspond à ces filtres</i>
            </p>
          </div>
        )}

        <DeclarantsPagination
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

export default DeclarantsList
