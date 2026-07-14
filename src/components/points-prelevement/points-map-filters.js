'use client'

import {
  useEffect, useRef, useState
} from 'react'

import {getPointFlowTypeColors, pointFlowTypeLabels} from '@/lib/point-flow-types.js'

const FilterCheckbox = ({checked, color, label, showColorMarker = true, onChange}) => (
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
  </label>
)

const toggleSelection = (values, value, checked) => checked
  ? [...values, value]
  : values.filter(item => item !== value)

const PointsMapFilters = ({
  disabled,
  filters,
  hasActiveFilters,
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
  const flowTypeOptions = Object.entries(pointFlowTypeLabels).map(([value, label]) => ({
    color: getPointFlowTypeColors(value).accentColor,
    value,
    label
  }))
  const advancedFilterCount = [
    filters.usageKeys.length !== usageOptions.length,
    filters.flowTypes.length !== flowTypeOptions.length,
    filters.waterBodyTypes.length !== waterBodyTypeOptions.length
  ].filter(Boolean).length

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
    if (!disabled) {
      searchInputRef.current?.focus()
    }
  }, [disabled])

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
            placeholder='Ex. Forage de la source'
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

      <div className='mt-2 flex min-h-8 items-center gap-2'>
        <button
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
            Effacer les filtres
          </button>
        )}
      </div>

      {open && (
        <div className='absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 max-h-[min(520px,calc(100dvh-15rem))] overflow-y-auto border border-gray-300 bg-white p-3 shadow-lg'>
          <fieldset className='m-0 border-0 p-0'>
            <legend className='mb-1 text-xs font-semibold text-gray-900'>Type de point</legend>
            <div className='grid grid-cols-2 gap-x-2'>
              {flowTypeOptions.map(option => (
                <FilterCheckbox
                  key={option.value}
                  checked={filters.flowTypes.includes(option.value)}
                  color={option.color}
                  label={option.label}
                  showColorMarker={false}
                  onChange={checked => onChange({
                    flowTypes: toggleSelection(filters.flowTypes, option.value, checked)
                  })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className='mt-3 border-0 border-t border-gray-200 p-0 pt-2'>
            <legend className='mb-1 text-xs font-semibold text-gray-900'>Type de milieu</legend>
            <div className='flex flex-col'>
              {waterBodyTypeOptions.map(option => (
                <FilterCheckbox
                  key={option.value}
                  checked={filters.waterBodyTypes.includes(option.value)}
                  label={option.label}
                  onChange={checked => onChange({
                    waterBodyTypes: toggleSelection(filters.waterBodyTypes, option.value, checked)
                  })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className='relative mt-3 border-0 border-t border-gray-200 p-0 pt-2'>
            <legend className='mb-1 text-xs font-semibold text-gray-900'>Usages</legend>
            {filters.usageKeys.length !== usageOptions.length && (
              <button
                className='absolute right-0 top-2 cursor-pointer text-xs text-[#000091] underline decoration-1 underline-offset-2'
                type='button'
                onClick={() => onChange({
                  usageKeys: usageOptions.map(option => option.value)
                })}
              >
                Afficher tous les usages
              </button>
            )}
            <div className='clear-both flex flex-col'>
              {usageOptions.map(option => (
                <FilterCheckbox
                  key={option.value}
                  checked={filters.usageKeys.includes(option.value)}
                  color={option.color}
                  label={option.label}
                  onChange={checked => onChange({
                    usageKeys: toggleSelection(filters.usageKeys, option.value, checked)
                  })}
                />
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </section>
  )
}

export default PointsMapFilters
