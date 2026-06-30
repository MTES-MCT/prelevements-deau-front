'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box} from '@mui/material'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import useDebouncedValue from '@/hook/use-debounced-value.js'

export const DEFAULT_ZONE_PER_PAGE = 20

export const ZONE_DECLARANT_FILTERS = [
  {
    name: 'collecteur',
    label: 'Collecteur',
    emptyLabel: 'Tous les rattachements',
    options: [
      {value: 'WITH_COLLECTEUR', label: 'Lié à un collecteur'},
      {value: 'WITHOUT_COLLECTEUR', label: 'Non lié à un collecteur'}
    ]
  },
  {
    name: 'email',
    label: 'Adresse email',
    emptyLabel: 'Tous les emails',
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  }
]

export const ZONE_COLLECTEUR_FILTERS = [
  {
    name: 'email',
    label: 'Adresse email',
    emptyLabel: 'Tous les emails',
    options: [
      {value: 'WITH_EMAIL', label: 'Avec email'},
      {value: 'WITHOUT_EMAIL', label: 'Sans email'}
    ]
  }
]

export const ZONE_EXPLOITATION_FILTERS = [
  {
    name: 'status',
    label: 'Statut',
    emptyLabel: 'Tous les statuts',
    options: [
      {value: 'EN_ACTIVITE', label: 'En activité'},
      {value: 'TERMINEE', label: 'Terminées'},
      {value: 'ABANDONNEE', label: 'Abandonnées'},
      {value: 'NON_RENSEIGNE', label: 'Non renseigné'}
    ]
  },
  {
    name: 'collecteur',
    label: 'Collecteur',
    emptyLabel: 'Avec ou sans collecteur',
    options: [
      {value: 'WITH_COLLECTEUR', label: 'Avec collecteur'},
      {value: 'WITHOUT_COLLECTEUR', label: 'Sans collecteur'}
    ]
  }
]

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
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
    filters: meta?.filters ?? {}
  }
}

function buildHref(searchParams, nextValues) {
  const params = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(nextValues)) {
    if (value === undefined || value === null || value === '' || value === 1 || value === '1') {
      params.delete(key)
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
  const activeFiltersCount = Object.values(normalizedMeta.filters ?? {}).filter(Boolean).length

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
      <p className='fr-hint-text fr-mt-1w'>La recherche se lance automatiquement après une courte pause.</p>
    </div>
  )
}

const ZoneFilterSelect = ({filter}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const id = `zone-filter-${filter.name}`

  return (
    <div className='fr-select-group fr-mb-0 min-w-56'>
      <label className='fr-label' htmlFor={id}>{filter.label}</label>
      <select
        className='fr-select'
        id={id}
        value={searchParams.get(filter.name) || ''}
        onChange={event => {
          const params = new URLSearchParams(searchParams.toString())
          const {value} = event.target

          if (value) {
            params.set(filter.name, value)
          } else {
            params.delete(filter.name)
          }

          params.delete('page')
          router.replace(buildPathnameWithParams(pathname, params), {scroll: false})
        }}
      >
        <option value=''>{filter.emptyLabel || 'Tous'}</option>
        {filter.options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

const ZoneFilters = ({filters = []}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasActiveFilter = filters.some(filter => searchParams.get(filter.name))

  if (filters.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col md:flex-row md:items-end gap-3'>
      <div className='flex flex-col md:flex-row gap-3 flex-wrap'>
        {filters.map(filter => <ZoneFilterSelect key={filter.name} filter={filter} />)}
      </div>

      {hasActiveFilter && (
        <Button
          priority='tertiary no outline'
          size='small'
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString())

            for (const filter of filters) {
              params.delete(filter.name)
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
  action = null
}) => (
  <div className='flex flex-col gap-4'>
    <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-3'>
      <ZoneResultsSummary itemLabel={itemLabel} itemPlural={itemPlural} meta={meta} />
      {action}
    </div>

    <ZoneSearchControl label={searchLabel} placeholder={searchPlaceholder} />
    <ZoneFilters filters={filters} />
  </div>
)
