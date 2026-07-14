'use client'

import {useState} from 'react'

const PointsMapLegend = ({options, counts, selectedValues, onToggle}) => {
  const [open, setOpen] = useState(false)
  const visibleOptions = options.filter(option => (counts[option.value] ?? 0) > 0)

  if (visibleOptions.length === 0) {
    return null
  }

  return (
    <div className='relative max-w-[220px] bg-white/95 shadow-md'>
      {open && (
        <fieldset className='m-0 border-0 border-b border-gray-200 px-2 py-1.5'>
          <legend className='sr-only'>Usages affichés sur la carte</legend>
          <div className='flex max-h-[150px] min-w-[190px] flex-col gap-0.5 overflow-y-auto pr-1 text-[0.6875rem] sm:max-h-[210px]'>
            {visibleOptions.map(option => {
              const count = counts[option.value] ?? 0
              const checked = selectedValues.includes(option.value)

              return (
                <label
                  key={option.value}
                  className='flex cursor-pointer items-center gap-1.5 py-px'
                >
                  <input
                    checked={checked}
                    className='h-3 w-3 shrink-0 cursor-pointer'
                    style={{accentColor: option.color}}
                    type='checkbox'
                    onChange={event => onToggle(option.value, event.target.checked)}
                  />
                  <span className='min-w-0 flex-1 leading-[0.875rem]'>{option.label}</span>
                  <span className='shrink-0 tabular-nums text-gray-500' aria-label={`${count} point${count > 1 ? 's' : ''}`}>
                    {count}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      <button
        aria-expanded={open}
        className='flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-medium text-[#000091] hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#000091]'
        type='button'
        onClick={() => setOpen(current => !current)}
      >
        <span aria-hidden='true' className='fr-icon-pie-chart-2-line text-sm' />
        <span className='flex-1 text-left'>{open ? 'Masquer la légende' : 'Afficher la légende'}</span>
        <span aria-hidden='true' className={`${open ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-up-s-line'} text-sm`} />
      </button>
    </div>
  )
}

export default PointsMapLegend
