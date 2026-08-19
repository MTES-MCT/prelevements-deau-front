'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box} from '@mui/material'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import useDebouncedValue from '@/hook/use-debounced-value.js'

export const DEFAULT_ZONE_PER_PAGE = 20

export const ZONE_DECLARANT_FILTERS = [
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
    legacyNames: ['email'],
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  },
  {
    name: 'usageCodes',
    label: 'Usage',
    emptyLabel: 'Tous les usages',
    facetKeys: ['usages'],
    legacyNames: ['usage'],
    multiple: true
  },
  {
    name: 'exploitationStatuses',
    label: 'Statut exploitation',
    emptyLabel: 'Tous les statuts',
    facetKeys: ['exploitationStatuses'],
    legacyNames: ['status'],
    multiple: true,
    options: [
      {value: 'EN_ACTIVITE', label: 'En activité'},
      {value: 'TERMINEE', label: 'Terminée'},
      {value: 'ABANDONNEE', label: 'Abandonnée'},
      {value: 'NON_RENSEIGNE', label: 'Non renseigné'}
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

export const ZONE_COLLECTEUR_FILTERS = [
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
    legacyNames: ['email'],
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  }
]

export const ZONE_EXPLOITATION_FILTERS = [
  {
    name: 'usageCodes',
    label: 'Usage',
    emptyLabel: 'Tous les usages',
    facetKeys: ['usages'],
    legacyNames: ['usage'],
    multiple: true
  },
  {
    name: 'exploitationStatuses',
    label: 'Statut exploitation',
    emptyLabel: 'Tous les statuts',
    facetKeys: ['exploitationStatuses'],
    legacyNames: ['status'],
    multiple: true,
    options: [
      {value: 'EN_ACTIVITE', label: 'En activité'},
      {value: 'TERMINEE', label: 'Terminées'},
      {value: 'ABANDONNEE', label: 'Abandonnées'},
      {value: 'NON_RENSEIGNE', label: 'Non renseigné'}
    ]
  },
  {
    name: 'collecteurStatus',
    label: 'Collecteur',
    emptyLabel: 'Avec ou sans collecteur',
    facetKeys: ['collecteurStatuses'],
    legacyNames: ['collecteur', 'collector'],
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

export const ZONE_POINT_FILTERS = [
  {
    name: 'usageCodes',
    label: 'Usage',
    emptyLabel: 'Tous les usages',
    facetKeys: ['usages'],
    legacyNames: ['usage'],
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
    name: 'flowTypes',
    label: 'Flux',
    emptyLabel: 'Tous les flux',
    facetKeys: ['flowTypes'],
    multiple: true,
    options: [
      {value: 'PRELEVEMENT', label: 'Prélèvement'},
      {value: 'REJET', label: 'Rejet'}
    ]
  },
  {
    name: 'exploitationStatuses',
    label: 'Statut exploitation',
    emptyLabel: 'Tous les statuts',
    facetKeys: ['exploitationStatuses'],
    legacyNames: ['status'],
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
    label: 'Collecteur',
    emptyLabel: 'Avec ou sans collecteur',
    facetKeys: ['collecteurStatuses'],
    legacyNames: ['collecteur', 'collector'],
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
    name: 'preleveurTypes',
    label: 'Type de préleveur',
    emptyLabel: 'Tous les types',
    facetKeys: ['preleveurTypes'],
    multiple: true,
    options: [
      {value: 'ICPE', label: 'ICPE'},
      {value: 'IRRIGANT', label: 'Irrigant'},
      {value: 'GESTIONNAIRE_AEP', label: 'Gestionnaire AEP'},
      {value: 'AUTRE', label: 'Autre'}
    ]
  }
]

export const ZONE_NAME_SORT_OPTIONS = [
  {value: 'RELEVANCE', label: 'Pertinence'},
  {value: 'NAME', label: 'Nom'}
]

export const ZONE_ACTIVITY_SORT_OPTIONS = [
  ...ZONE_NAME_SORT_OPTIONS,
  {value: 'LAST_DECLARATION', label: 'Dernière déclaration'}
]

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

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

function getFacetOptions(facets, filter, selectedValues = []) {
  const staticOptions = filter.options || []
  const staticByValue = new Map(staticOptions.map(option => [option.value, option]))
  const facetKey = [filter.name, ...(filter.facetKeys || [])]
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

function getSelectedFilterValues(searchParams, filter) {
  const names = [filter.name, ...(filter.legacyNames || [])]
  const values = names.flatMap(name => searchParams.getAll(name)).filter(Boolean)

  return filter.multiple ? [...new Set(values)] : values.slice(0, 1)
}

function normalizeMeta(meta, fallbackCount = 0) {
  const count = Number(meta?.count ?? fallbackCount)
  const total = Number(meta?.total ?? fallbackCount)
  const totalAll = Number(meta?.totalAll ?? total)
  const page = Number(meta?.page ?? 1)
  const perPage = Number(meta?.perPage ?? DEFAULT_ZONE_PER_PAGE)
  const pages = Number(meta?.pages ?? Math.max(1, Math.ceil(total / perPage)))

  return {
    count,
    total,
    totalAll,
    page,
    perPage,
    pages,
    search: meta?.search ?? null,
    filters: meta?.filters ?? {},
    facets: meta?.facets ?? {},
    sort: meta?.sort ?? null,
    order: meta?.order ?? null
  }
}

function buildHref(searchParams, nextValues) {
  const params = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(nextValues)) {
    params.delete(key)

    if (value === undefined || value === null || value === '' || value === 1 || value === '1') {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value.filter(Boolean)) {
        params.append(key, String(item))
      }
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  return query ? `?${query}` : '?'
}

function buildPathnameWithParams(pathname, searchParams) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export const ZoneResultsSummary = ({meta, itemLabel = 'élément', itemPlural = `${itemLabel}s`}) => {
  const normalizedMeta = normalizeMeta(meta)
  const displayedLabel = pluralize(normalizedMeta.count, `${itemLabel} affiché`, `${itemPlural} affichés`)
  const resultLabel = pluralize(normalizedMeta.total, 'résultat', 'résultats')
  const totalLabel = pluralize(normalizedMeta.totalAll, itemLabel, itemPlural)
  const activeFiltersCount = Object.values(normalizedMeta.filters ?? {})
    .filter(value => Array.isArray(value) ? value.length > 0 : Boolean(value))
    .length

  return (
    <div>
      <p className='fr-text--lead fr-mb-0'>{displayedLabel}</p>
      <p className='fr-text--sm fr-mb-0'>
        {normalizedMeta.search || activeFiltersCount > 0
          ? `${resultLabel} filtré${normalizedMeta.total > 1 ? 's' : ''}, ${totalLabel} dans la zone`
          : `${totalLabel} dans la zone`}
      </p>
    </div>
  )
}

export const ZoneSearchControl = ({label = 'Rechercher', placeholder = 'Rechercher', delay = 350}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const [value, setValue] = useState(initialSearch)
  const debouncedValue = useDebouncedValue(value, delay)

  useEffect(() => {
    setValue(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const current = searchParams.get('search') || ''

    if (debouncedValue.trim() === current) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const nextSearch = debouncedValue.trim()

    if (nextSearch) {
      params.set('search', nextSearch)
    } else {
      params.delete('search')
    }

    params.delete('page')
    router.replace(buildPathnameWithParams(pathname, params), {scroll: false})
  }, [debouncedValue, pathname, router, searchParams])

  return (
    <div className='fr-input-group fr-mb-0'>
      <label className='fr-label' htmlFor='zone-resource-search'>{label}</label>
      <input
        className='fr-input'
        id='zone-resource-search'
        placeholder={placeholder}
        type='search'
        value={value}
        onChange={event => setValue(event.target.value)}
      />
    </div>
  )
}

const ZoneFilterSelect = ({facets, filter}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const id = `zone-filter-${filter.name}`
  const selectedValues = getSelectedFilterValues(searchParams, filter)
  const options = getFacetOptions(facets, filter, selectedValues)
  const hasFacet = [filter.name, ...(filter.facetKeys || [])]
    .some(key => facets && Object.hasOwn(facets, key))

  if (options.length === 0 || (hasFacet && options.length <= 1 && selectedValues.length === 0)) {
    return null
  }

  return (
    <div className='fr-select-group fr-mb-0 min-w-56'>
      <label className='fr-label' htmlFor={id}>{filter.label}</label>
      <select
        className='fr-select'
        id={id}
        value={selectedValues[0] || ''}
        onChange={event => {
          const params = new URLSearchParams(searchParams.toString())
          const {value} = event.target

          for (const name of [filter.name, ...(filter.legacyNames || [])]) {
            params.delete(name)
          }

          if (value) {
            params.append(filter.name, value)
          }

          params.delete('page')
          router.replace(buildPathnameWithParams(pathname, params), {scroll: false})
        }}
      >
        <option value=''>{filter.emptyLabel || 'Tous'}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}{option.count === null || option.count === undefined ? '' : ` (${option.count})`}
          </option>
        ))}
      </select>
    </div>
  )
}

const ZoneFilters = ({facets = {}, filters = []}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const visibleFilters = filters.filter(filter => {
    const selectedValues = getSelectedFilterValues(searchParams, filter)
    const options = getFacetOptions(facets, filter, selectedValues)
    const hasFacet = [filter.name, ...(filter.facetKeys || [])]
      .some(key => Object.hasOwn(facets, key))

    return options.length > 0
      && (!hasFacet || options.length > 1 || selectedValues.length > 0)
  })
  const hasActiveFilter = visibleFilters.some(filter => (
    [filter.name, ...(filter.legacyNames || [])].some(name => searchParams.get(name))
  ))

  if (visibleFilters.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col md:flex-row md:items-end gap-3'>
      <div className='flex flex-col md:flex-row gap-3 flex-wrap'>
        {visibleFilters.map(filter => (
          <ZoneFilterSelect key={filter.name} facets={facets} filter={filter} />
        ))}
      </div>

      {hasActiveFilter && (
        <Button
          priority='tertiary no outline'
          size='small'
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString())

            for (const filter of visibleFilters) {
              for (const name of [filter.name, ...(filter.legacyNames || [])]) {
                params.delete(name)
              }
            }

            params.delete('page')
            router.replace(buildPathnameWithParams(pathname, params), {scroll: false})
          }}
        >
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  )
}

const ZoneSortSelect = ({options = []}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (options.length === 0) {
    return null
  }

  const currentSort = searchParams.get('sort')
    || (searchParams.get('search') ? 'RELEVANCE' : 'NAME')

  return (
    <div className='fr-select-group fr-mb-0 min-w-56'>
      <label className='fr-label' htmlFor='zone-resource-sort'>Trier par</label>
      <select
        className='fr-select'
        id='zone-resource-sort'
        value={currentSort}
        onChange={event => {
          const params = new URLSearchParams(searchParams.toString())
          params.set('sort', event.target.value)
          params.delete('page')
          router.replace(buildPathnameWithParams(pathname, params), {scroll: false})
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

export const ZonePagination = ({meta}) => {
  const searchParams = useSearchParams()
  const normalizedMeta = normalizeMeta(meta)
  const {pages} = normalizedMeta

  const pageNumbers = useMemo(() => {
    const result = new Set([1, pages, normalizedMeta.page - 1, normalizedMeta.page, normalizedMeta.page + 1])
    return [...result]
      .filter(page => page >= 1 && page <= pages)
      .sort((a, b) => a - b)
  }, [normalizedMeta.page, pages])

  if (pages <= 1 && normalizedMeta.perPage === DEFAULT_ZONE_PER_PAGE) {
    return null
  }

  return (
    <Box className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 fr-mt-2w'>
      <div className='flex flex-wrap gap-2'>
        <Button
          disabled={normalizedMeta.page <= 1}
          priority='tertiary no outline'
          size='small'
          linkProps={{href: buildHref(searchParams, {page: normalizedMeta.page - 1})}}
        >
          Précédent
        </Button>

        {pageNumbers.map((page, index) => {
          const previous = pageNumbers[index - 1]
          const needsEllipsis = previous && page - previous > 1

          return (
            <span key={page} className='flex gap-2 items-center'>
              {needsEllipsis && <span className='fr-text--sm'>…</span>}
              <Button
                priority={page === normalizedMeta.page ? 'primary' : 'tertiary no outline'}
                size='small'
                linkProps={{href: buildHref(searchParams, {page})}}
              >
                {page}
              </Button>
            </span>
          )
        })}

        <Button
          disabled={normalizedMeta.page >= pages}
          priority='tertiary no outline'
          size='small'
          linkProps={{href: buildHref(searchParams, {page: normalizedMeta.page + 1})}}
        >
          Suivant
        </Button>
      </div>

      <div className='flex items-center gap-2'>
        <span className='fr-text--sm fr-mb-0'>Par page</span>
        {[20, 50, 100].map(value => (
          <Button
            key={value}
            priority={normalizedMeta.perPage === value ? 'primary' : 'tertiary no outline'}
            size='small'
            linkProps={{href: buildHref(searchParams, {perPage: value, page: 1})}}
          >
            {value}
          </Button>
        ))}
      </div>
    </Box>
  )
}

export const ZoneResourceToolbar = ({
  meta,
  itemLabel,
  itemPlural,
  searchLabel,
  searchPlaceholder,
  filters = [],
  sortOptions = [],
  action = null
}) => {
  const normalizedMeta = normalizeMeta(meta)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-3'>
        <ZoneResultsSummary itemLabel={itemLabel} itemPlural={itemPlural} meta={normalizedMeta} />
        {action}
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-[minmax(18rem,1fr)_minmax(14rem,.35fr)] md:items-end'>
        <ZoneSearchControl label={searchLabel} placeholder={searchPlaceholder} />
        <ZoneSortSelect options={sortOptions} />
      </div>
      <ZoneFilters facets={normalizedMeta.facets} filters={filters} />
    </div>
  )
}
