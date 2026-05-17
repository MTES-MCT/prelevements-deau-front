'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box} from '@mui/material'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import useDebouncedValue from '@/hook/use-debounced-value.js'

export const DEFAULT_ZONE_PER_PAGE = 20

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
    search: meta?.search ?? null
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

export function readListOptions(searchParams = {}) {
  const page = Number.parseInt(searchParams.page || '1', 10)
  const perPage = Number.parseInt(searchParams.perPage || String(DEFAULT_ZONE_PER_PAGE), 10)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : DEFAULT_ZONE_PER_PAGE,
    search: typeof searchParams.search === 'string' ? searchParams.search.trim() : ''
  }
}

export function unwrapPaginatedData(payload, fallback = []) {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: normalizeMeta(null, payload.length)
    }
  }

  const data = Array.isArray(payload?.data) ? payload.data : fallback

  return {
    data,
    meta: normalizeMeta(payload?.meta, data.length)
  }
}

export const ZoneResultsSummary = ({meta, itemLabel = 'élément', itemPlural = `${itemLabel}s`}) => {
  const normalizedMeta = normalizeMeta(meta)
  const displayedLabel = pluralize(normalizedMeta.count, `${itemLabel} affiché`, `${itemPlural} affichés`)
  const resultLabel = pluralize(normalizedMeta.total, 'résultat', 'résultats')
  const totalLabel = pluralize(normalizedMeta.totalAll, itemLabel, itemPlural)

  return (
    <div>
      <p className='fr-text--lead fr-mb-0'>{displayedLabel}</p>
      <p className='fr-text--sm fr-mb-0'>
        {normalizedMeta.search
          ? `${resultLabel} pour la recherche, ${totalLabel} dans la zone`
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

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false})
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
  action = null
}) => (
  <div className='flex flex-col gap-4'>
    <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-3'>
      <ZoneResultsSummary itemLabel={itemLabel} itemPlural={itemPlural} meta={meta} />
      {action}
    </div>

    <ZoneSearchControl label={searchLabel} placeholder={searchPlaceholder} />
  </div>
)
