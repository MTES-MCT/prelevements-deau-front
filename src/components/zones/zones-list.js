'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import Link from 'next/link'

import ZoneExportButton from '@/components/zones/zone-export-button.js'
import {ZONES_EXPORT_COLUMNS} from '@/components/zones/zone-export-columns.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import {matchesSearchTerms} from '@/lib/search-options.js'

const activityFilterOptions = [
  {label: 'Toutes les zones', value: 'ALL'},
  {label: 'Avec activité', value: 'WITH_ACTIVITY'},
  {label: 'Sans activité', value: 'WITHOUT_ACTIVITY'}
]
const defaultPageSize = 25
const pageSizeOptions = [25, 50, 100]
const zoneRowGridClassName = 'md:grid-cols-[minmax(12rem,1.15fr)_minmax(8.5rem,.55fr)_minmax(17rem,1fr)_minmax(6.5rem,6.5rem)]'
const zoneTypeFilterOptions = [
  {
    checkboxClassName: 'accent-[#000091]',
    checkedClassName: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    colorClassName: 'text-[#000091]',
    iconClassName: ZONE_ICONS.mapPin2,
    label: 'Région',
    value: 'REGION'
  },
  {
    checkboxClassName: 'accent-[#18753c]',
    checkedClassName: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    colorClassName: 'text-[#18753c]',
    iconClassName: ZONE_ICONS.mapPin,
    label: 'Département',
    value: 'DEPARTEMENT'
  },
  {
    checkboxClassName: 'accent-[#8d533e]',
    checkedClassName: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    colorClassName: 'text-[#8d533e]',
    iconClassName: ZONE_ICONS.water,
    label: 'SAGE',
    value: 'SAGE'
  }
]
const zoneTypePresentations = Object.fromEntries(zoneTypeFilterOptions.map(option => [option.value, option]))

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function hasZoneActivity(zone) {
  return [zone.pointsCount, zone.declarantsCount, zone.exploitationsCount]
    .some(count => Number(count || 0) > 0)
}

function getZoneSearchText(zone) {
  return normalizeSearch([
    zone.name,
    zone.code,
    zone.type,
    zoneTypePresentations[zone.type]?.label,
    zone.isAdmin ? 'acces complet' : `${zone.permissions?.length || 0} droits attribues`
  ].filter(Boolean).join(' '))
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

const ZoneTypeChip = ({type}) => {
  const presentation = zoneTypePresentations[type] || {
    checkedClassName: 'border-gray-300 bg-gray-100 text-gray-700',
    colorClassName: 'text-gray-600',
    iconClassName: ZONE_ICONS.mapPin2,
    label: type
  }

  return (
    <span className={`inline-flex w-fit items-center gap-1 border px-1.5 py-0.5 text-xs font-medium ${presentation.checkedClassName}`}>
      <span
        className={`${presentation.iconClassName} ${presentation.colorClassName} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
        aria-hidden='true'
      />
      {presentation.label}
    </span>
  )
}

const ZonesListHeader = () => (
  <div className={`hidden gap-2.5 border-b border-gray-200 bg-white px-3 py-1.5 text-[0.74rem] font-semibold leading-none text-gray-600 md:grid ${zoneRowGridClassName} md:items-center`}>
    <div>Zone</div>
    <div>Accès</div>
    <div>Rattachements</div>
    <div aria-hidden='true' />
  </div>
)

const ZonesPagination = ({className = '', page, setPage, totalPages}) => {
  const pageItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages])

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className={`flex justify-end ${className}`} aria-label='Pagination des zones'>
      <div className='flex flex-wrap items-center justify-center gap-1'>
        <Button
          disabled={page <= 1}
          priority='tertiary no outline'
          size='small'
          onClick={() => setPage(page - 1)}
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
              aria-current={item === page ? 'page' : undefined}
              priority={item === page ? 'primary' : 'tertiary no outline'}
              size='small'
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        })}

        <Button
          disabled={page >= totalPages}
          priority='tertiary no outline'
          size='small'
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  )
}

const ZoneRow = ({zone}) => {
  const activity = hasZoneActivity(zone)

  return (
    <Link className='block text-inherit no-underline' href={`/zones/${zone.id}`}>
      <article className={`group grid gap-2.5 bg-white px-3 py-2.5 transition-colors hover:bg-[#f7f7ff] md:items-center ${zoneRowGridClassName}`}>
        <div className='min-w-0'>
          <div className='mb-1.5 flex flex-wrap items-center gap-1.5'>
            <ZoneTypeChip type={zone.type} />
            {!activity && (
              <span className='inline-flex bg-[#fff3cd] px-1.5 py-0.5 text-xs font-medium text-[#716043]'>
                Sans activité
              </span>
            )}
          </div>
          <p className='fr-mb-0 truncate text-sm font-semibold leading-snug text-gray-900 group-hover:text-[#000091]'>
            {zone.name}
          </p>
          <p className='fr-mb-0 mt-0.5 truncate text-xs text-gray-600'>{zone.code}</p>
        </div>

        <div className='min-w-0'>
          <span className={`inline-flex w-fit px-1.5 py-0.5 text-xs font-medium ${zone.isAdmin ? 'bg-[#e6f4ea] text-[#18753c]' : 'bg-[#eeeeff] text-[#000091]'}`}>
            {zone.isAdmin ? 'Accès complet' : pluralize(zone.permissions?.length || 0, 'droit', 'droits')}
          </span>
        </div>

        <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700'>
          <span className='inline-flex items-center gap-1'>
            <span className={`${ZONE_ICONS.water} text-gray-500 [&::after]:![--icon-size:0.8rem] [&::before]:![--icon-size:0.8rem]`} aria-hidden='true' />
            {pluralize(Number(zone.pointsCount || 0), 'point')}
          </span>
          <span className='inline-flex items-center gap-1'>
            <span className={`${ZONE_ICONS.user} text-gray-500 [&::after]:![--icon-size:0.8rem] [&::before]:![--icon-size:0.8rem]`} aria-hidden='true' />
            {pluralize(Number(zone.declarantsCount || 0), 'déclarant')}
          </span>
          {zone.exploitationsCount !== undefined && (
            <span className='inline-flex items-center gap-1'>
              <span className={`${ZONE_ICONS.briefcase} text-gray-500 [&::after]:![--icon-size:0.8rem] [&::before]:![--icon-size:0.8rem]`} aria-hidden='true' />
              {pluralize(Number(zone.exploitationsCount || 0), 'exploitation')}
            </span>
          )}
          <span className='inline-flex items-center gap-1'>
            <span className={`${ZONE_ICONS.team} text-gray-500 [&::after]:![--icon-size:0.8rem] [&::before]:![--icon-size:0.8rem]`} aria-hidden='true' />
            {pluralize(Number(zone.instructorsCount || 0), 'agent')}
          </span>
        </div>

        <span className='fr-link fr-icon-arrow-right-line fr-link--icon-right justify-self-start text-sm font-medium md:justify-self-end'>
          Consulter
        </span>
      </article>
    </Link>
  )
}

const ZonesList = ({isGlobalAdmin, zones}) => {
  const availableTypeOptions = useMemo(() => {
    const availableTypes = new Set(zones.map(zone => zone.type))

    return zoneTypeFilterOptions.filter(option => availableTypes.has(option.value))
  }, [zones])
  const activityCounts = useMemo(() => {
    const withActivity = zones.filter(zone => hasZoneActivity(zone)).length

    return {
      ALL: zones.length,
      WITH_ACTIVITY: withActivity,
      WITHOUT_ACTIVITY: zones.length - withActivity
    }
  }, [zones])
  const defaultActivityFilter = isGlobalAdmin && activityCounts.WITH_ACTIVITY > 0 ? 'WITH_ACTIVITY' : 'ALL'
  const [activityFilter, setActivityFilter] = useState(defaultActivityFilter)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(() => availableTypeOptions.map(option => option.value))
  const debouncedQuery = useDebouncedValue(query, 250)
  const selectedTypesSet = useMemo(() => new Set(selectedTypes), [selectedTypes])

  const filteredZones = useMemo(() => zones.filter(zone => {
    if (!selectedTypesSet.has(zone.type)) {
      return false
    }

    if (activityFilter === 'WITH_ACTIVITY' && !hasZoneActivity(zone)) {
      return false
    }

    if (activityFilter === 'WITHOUT_ACTIVITY' && hasZoneActivity(zone)) {
      return false
    }

    return matchesSearchTerms(getZoneSearchText(zone), debouncedQuery)
  }), [activityFilter, debouncedQuery, selectedTypesSet, zones])

  const totalPages = Math.max(1, Math.ceil(filteredZones.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const firstItemIndex = (currentPage - 1) * pageSize
  const visibleZones = filteredZones.slice(firstItemIndex, firstItemIndex + pageSize)
  const exportableZones = filteredZones.filter(zone => zone.permissions?.includes('zone.export'))
  const hasActiveFilters = Boolean(
    query.trim()
    || activityFilter !== defaultActivityFilter
    || selectedTypes.length !== availableTypeOptions.length
  )

  const resetFilters = () => {
    setActivityFilter(defaultActivityFilter)
    setPage(1)
    setQuery('')
    setSelectedTypes(availableTypeOptions.map(option => option.value))
  }

  const toggleType = type => {
    setPage(1)
    setSelectedTypes(previous => previous.includes(type)
      ? previous.filter(selectedType => selectedType !== type)
      : zoneTypeFilterOptions.map(option => option.value).filter(value => [...previous, type].includes(value)))
  }

  if (zones.length === 0) {
    return (
      <div className='fr-mb-4w border border-gray-200 bg-white px-4 py-6'>
        <p className='fr-mb-0'><i>Aucune zone active n’est rattachée à votre compte.</i></p>
      </div>
    )
  }

  return (
    <div className='fr-mb-4w'>
      <section className='fr-mb-3w border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des zones'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <h2 className='fr-h6 fr-mb-0'>Filtres</h2>

          {hasActiveFilters && (
            <Button
              iconId='fr-icon-refresh-line'
              priority='secondary'
              size='small'
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-x-4 gap-y-3 ${isGlobalAdmin ? 'md:grid-cols-[minmax(14rem,1fr)_minmax(12rem,.55fr)]' : ''} md:items-end`}>
          <div className='fr-input-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='zones-search'>Zone</label>
            <input
              className='fr-input'
              id='zones-search'
              placeholder='Nom ou code de la zone'
              type='search'
              value={query}
              onChange={event => {
                setPage(1)
                setQuery(event.target.value)
              }}
            />
          </div>

          {isGlobalAdmin && (
            <div className='fr-select-group fr-mb-0 min-w-0'>
              <label className='fr-label min-h-6' htmlFor='zones-activity-filter'>Activité</label>
              <select
                className='fr-select'
                id='zones-activity-filter'
                value={activityFilter}
                onChange={event => {
                  setActivityFilter(event.target.value)
                  setPage(1)
                }}
              >
                {activityFilterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({activityCounts[option.value]})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className='mt-3 border-t border-gray-100 pt-3' role='group' aria-labelledby='zone-types-filter-label'>
          <div className='fr-label fr-mb-1w min-h-6' id='zone-types-filter-label'>Types de zone</div>
          <div className='flex flex-wrap gap-2'>
            {availableTypeOptions.map(option => {
              const checked = selectedTypesSet.has(option.value)

              return (
                <label
                  key={option.value}
                  className={`inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-sm font-medium transition-colors ${checked ? option.checkedClassName : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                  htmlFor={`zone-type-filter-${option.value}`}
                >
                  <input
                    checked={checked}
                    className={`h-3.5 w-3.5 ${option.checkboxClassName}`}
                    id={`zone-type-filter-${option.value}`}
                    type='checkbox'
                    onChange={() => toggleType(option.value)}
                  />
                  <span
                    className={`${option.iconClassName} text-[0.66rem] ${checked ? option.colorClassName : 'text-gray-500'} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                    aria-hidden='true'
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
        </div>
      </section>

      <div className='fr-mb-2w flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <p className='fr-text--sm fr-mb-0 font-medium text-gray-900'>
            {filteredZones.length === 0
              ? 'Aucune zone'
              : `${firstItemIndex + 1}-${Math.min(firstItemIndex + pageSize, filteredZones.length)} sur ${pluralize(filteredZones.length, 'zone')}`}
          </p>
          <div className='flex items-center gap-1.5'>
            <label className='fr-label fr-mb-0 whitespace-nowrap text-xs text-gray-600' htmlFor='zones-page-size'>
              Par page
            </label>
            <div className='relative'>
              <select
                className='h-8 w-16 appearance-none border border-gray-300 bg-white pl-2 pr-6 text-sm'
                id='zones-page-size'
                value={pageSize}
                onChange={event => {
                  setPage(1)
                  setPageSize(Number(event.target.value))
                }}
              >
                {pageSizeOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <span
                className='fr-icon-arrow-down-s-line pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.62rem] text-gray-500 [&::after]:![--icon-size:0.68rem] [&::before]:![--icon-size:0.68rem]'
                aria-hidden='true'
              />
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end'>
          <ZonesPagination page={currentPage} setPage={setPage} totalPages={totalPages} />
          {exportableZones.length > 0 && (
            <ZoneExportButton
              columns={ZONES_EXPORT_COLUMNS}
              filename='zones.xlsx'
              label='Exporter la liste'
              rows={exportableZones}
              sheetName='Zones'
              size='small'
            />
          )}
        </div>
      </div>

      {visibleZones.length === 0 ? (
        <div className='border border-gray-200 bg-white px-4 py-6'>
          <p className='fr-mb-0'><i>Aucune zone ne correspond à ces paramètres.</i></p>
        </div>
      ) : (
        <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
          <ZonesListHeader />
          {visibleZones.map(zone => <ZoneRow key={zone.id} zone={zone} />)}
        </div>
      )}

      <ZonesPagination className='fr-mt-3w' page={currentPage} setPage={setPage} totalPages={totalPages} />
    </div>
  )
}

export default ZonesList
