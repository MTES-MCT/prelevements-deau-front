'use client'

import {
  useEffect, useMemo, useRef, useState
} from 'react'

import {getPointFlowTypeColors, pointFlowTypeLabels} from '@/lib/point-flow-types.js'
import {haveSameSelection} from '@/lib/points-prelevement-filters.js'
import {SEARCH_SORT_MODES} from '@/lib/smart-search.js'

const FilterCheckbox = ({checked, color, count, label, showColorMarker = true, onChange}) => (
  <label className='flex min-h-7 cursor-pointer items-center gap-2 px-1 py-0.5 text-xs hover:bg-gray-50'>
    <input
      checked={checked}
      className='h-3.5 w-3.5 shrink-0 cursor-pointer'
      style={color ? {accentColor: color} : undefined}
      type='checkbox'
      onChange={event => onChange(event.target.checked)}
    />
    {color && showColorMarker && (
      <span
        aria-hidden='true'
        className='h-2.5 w-2.5 shrink-0 rounded-full border border-gray-300'
        style={{backgroundColor: color}}
      />
    )}
    <span className='min-w-0 flex-1 leading-4'>{label}</span>
    {Number.isInteger(count) && (
      <span className='shrink-0 text-[0.65rem] tabular-nums text-gray-500'>{count}</span>
    )}
  </label>
)

const toggleSelection = (values, value, checked) => checked
  ? [...values, value]
  : values.filter(item => item !== value)

const FilterFieldset = ({
  className = '',
  counts,
  legend,
  options,
  scrollable = false,
  selectedValues,
  showColorMarker = true,
  onChange
}) => {
  if (options.length === 0) {
    return null
  }

  const allValues = options.map(option => option.value)
  const hasPartialSelection = !haveSameSelection(selectedValues, allValues)

  return (
    <fieldset className={`relative border-0 border-t border-gray-200 p-0 pt-2 ${className}`}>
      <legend className='mb-1 text-xs font-semibold text-gray-900'>{legend}</legend>
      {hasPartialSelection && (
        <button
          className='absolute right-0 top-2 cursor-pointer text-xs text-[#000091] underline decoration-1 underline-offset-2'
          type='button'
          onClick={() => onChange(allValues)}
        >
          Tout afficher
        </button>
      )}
      <div className={`clear-both flex flex-col ${scrollable ? 'max-h-44 overflow-y-auto pr-1' : ''}`}>
        {options.map(option => (
          <FilterCheckbox
            key={option.value}
            checked={selectedValues.includes(option.value)}
            color={option.color}
            count={counts?.[option.value]}
            label={option.label}
            showColorMarker={showColorMarker}
            onChange={checked => onChange(toggleSelection(selectedValues, option.value, checked))}
          />
        ))}
      </div>
    </fieldset>
  )
}

const PointsMapFilters = ({
  canSearchDeclarants,
  collecteurStatusOptions,
  connectorStatusOptions,
  disabled,
  exploitationStatusOptions,
  facetCounts,
  filters,
  hasActiveFilters,
  managementZoneOptions,
  openRequestKey,
  preleveurTypeOptions,
  resultsCount,
  searchPending,
  usageOptions,
  waterBodyTypeOptions,
  onChange,
  onReset
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)
  const flowTypeOptions = useMemo(() => Object.entries(pointFlowTypeLabels)
    .map(([value, label]) => ({
      color: getPointFlowTypeColors(value).accentColor,
      value,
      label
    })), [])
  const advancedFilterCount = [
    !haveSameSelection(filters.usageKeys, usageOptions.map(option => option.value)),
    !haveSameSelection(filters.flowTypes, flowTypeOptions.map(option => option.value)),
    !haveSameSelection(filters.waterBodyTypes, waterBodyTypeOptions.map(option => option.value)),
    !haveSameSelection(filters.managementZoneIds, managementZoneOptions.map(option => option.value)),
    !haveSameSelection(filters.exploitationStatuses, exploitationStatusOptions.map(option => option.value)),
    !haveSameSelection(filters.collecteurStatuses, collecteurStatusOptions.map(option => option.value)),
    !haveSameSelection(filters.connectorStatuses, connectorStatusOptions.map(option => option.value)),
    !haveSameSelection(filters.preleveurTypes, preleveurTypeOptions.map(option => option.value))
  ].filter(Boolean).length
  const effectiveSort = filters.query.trim()
    ? filters.sort
    : SEARCH_SORT_MODES.NAME

  useEffect(() => {
    const handleOutsideClick = event => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!disabled && globalThis.matchMedia?.('(min-width: 1024px)').matches) {
      searchInputRef.current?.focus()
    }
  }, [disabled])

  useEffect(() => {
    if (!openRequestKey) {
      return
    }

    setOpen(true)
    searchInputRef.current?.focus()
  }, [openRequestKey])

  return (
    <section ref={containerRef} className='relative z-20 shrink-0 border-b border-gray-200 bg-white p-3' aria-label='Filtres des points de prélèvement'>
      <div>
        <label className='mb-1 block text-xs font-semibold text-gray-800' htmlFor='points-prelevement-search'>
          Rechercher un point
        </label>
        <div className='relative'>
          <span aria-hidden='true' className='fr-icon-search-line pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-gray-600' />
          <input
            ref={searchInputRef}
            aria-busy={searchPending}
            className='h-10 w-full border border-gray-300 border-b-2 border-b-gray-700 bg-[#f6f6f6] pl-10 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-500 hover:bg-gray-100 focus:border-[#000091] focus:border-b-[#000091] focus:bg-white focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#000091] disabled:cursor-not-allowed disabled:bg-gray-100 [&::-webkit-search-cancel-button]:appearance-none'
            disabled={disabled}
            id='points-prelevement-search'
            placeholder={canSearchDeclarants
              ? 'Nom, commune, code, usage ou préleveur'
              : 'Nom, commune, code ou usage'}
            type='search'
            value={filters.query}
            onChange={event => onChange({query: event.target.value})}
          />
          {searchPending ? (
            <span className='absolute right-3 top-1/2 -translate-y-1/2' role='status'>
              <span aria-hidden='true' className='block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#000091]' />
              <span className='sr-only'>Recherche en cours</span>
            </span>
          ) : filters.query && (
            <button
              aria-label='Effacer la recherche'
              className='absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#000091]'
              title='Effacer la recherche'
              type='button'
              onClick={() => {
                onChange({query: ''})
                searchInputRef.current?.focus()
              }}
            >
              <span aria-hidden='true' className='fr-icon-close-line text-sm' />
            </button>
          )}
        </div>
      </div>

      <div className='mt-2 flex min-h-8 flex-wrap items-center gap-2'>
        <button
          aria-controls='points-prelevement-advanced-filters'
          aria-expanded={open}
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 border px-2.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091] ${advancedFilterCount > 0 ? 'border-[#000091] bg-[#ececfe] text-[#000091]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
          disabled={disabled}
          type='button'
          onClick={() => setOpen(current => !current)}
        >
          <span aria-hidden='true' className='fr-icon-filter-line text-sm' />
          <span>Filtres</span>
          {advancedFilterCount > 0 && (
            <span className='inline-flex h-4 min-w-4 items-center justify-center bg-[#000091] px-1 text-[0.625rem] font-bold text-white'>
              {advancedFilterCount}
            </span>
          )}
          <span aria-hidden='true' className={`${open ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} text-xs`} />
        </button>

        <label className='sr-only' htmlFor='points-prelevement-sort'>Trier les points</label>
        <select
          className='h-8 max-w-28 border border-gray-300 bg-white px-1.5 text-xs text-gray-700'
          id='points-prelevement-sort'
          value={effectiveSort}
          onChange={event => onChange({sort: event.target.value})}
        >
          <option disabled={!filters.query.trim()} value={SEARCH_SORT_MODES.RELEVANCE}>Pertinence</option>
          <option value={SEARCH_SORT_MODES.NAME}>Nom</option>
        </select>

        <p className='fr-mb-0 ml-auto whitespace-nowrap text-xs text-gray-600' aria-live='polite'>
          {resultsCount === null
            ? 'Chargement…'
            : <><strong>{resultsCount}</strong> point{resultsCount > 1 ? 's' : ''}</>}
        </p>

        {hasActiveFilters && (
          <button
            className='inline-flex h-8 cursor-pointer items-center whitespace-nowrap px-1 text-[0.6875rem] font-medium text-[#000091] underline decoration-1 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091]'
            type='button'
            onClick={onReset}
          >
            Effacer
          </button>
        )}
      </div>

      {open && (
        <div id='points-prelevement-advanced-filters' className='absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 max-h-[min(560px,calc(100dvh-13rem))] overflow-y-auto border border-gray-300 bg-white p-3 shadow-lg'>
          <FilterFieldset
            className='border-t-0 pt-0'
            counts={facetCounts.flowTypes}
            legend='Type de point'
            options={flowTypeOptions}
            selectedValues={filters.flowTypes}
            showColorMarker={false}
            onChange={flowTypes => onChange({flowTypes})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.waterBodyTypes}
            legend='Type de milieu'
            options={waterBodyTypeOptions}
            selectedValues={filters.waterBodyTypes}
            onChange={waterBodyTypes => onChange({waterBodyTypes})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.usageKeys}
            legend='Usages'
            options={usageOptions}
            selectedValues={filters.usageKeys}
            onChange={usageKeys => onChange({usageKeys})}
          />
          <FilterFieldset
            scrollable
            className='mt-3'
            counts={facetCounts.managementZoneIds}
            legend='Zones de gestion'
            options={managementZoneOptions}
            selectedValues={filters.managementZoneIds}
            onChange={managementZoneIds => onChange({managementZoneIds})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.exploitationStatuses}
            legend='État des exploitations'
            options={exploitationStatusOptions}
            selectedValues={filters.exploitationStatuses}
            onChange={exploitationStatuses => onChange({exploitationStatuses})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.collecteurStatuses}
            legend='Collecteurs'
            options={collecteurStatusOptions}
            selectedValues={filters.collecteurStatuses}
            onChange={collecteurStatuses => onChange({collecteurStatuses})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.connectorStatuses}
            legend='Connecteurs'
            options={connectorStatusOptions}
            selectedValues={filters.connectorStatuses}
            onChange={connectorStatuses => onChange({connectorStatuses})}
          />
          <FilterFieldset
            className='mt-3'
            counts={facetCounts.preleveurTypes}
            legend='Types de préleveur'
            options={preleveurTypeOptions}
            selectedValues={filters.preleveurTypes}
            onChange={preleveurTypes => onChange({preleveurTypes})}
          />
        </div>
      )}
    </section>
  )
}

export default PointsMapFilters
