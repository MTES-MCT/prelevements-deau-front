'use client'

import {useEffect, useRef, useState} from 'react'

const MAP_STYLES = [
  {value: 'plan-ign', label: 'Plan IGN'},
  {value: 'photo', label: 'Photographie aérienne'},
  {value: 'vector-ign', label: 'IGN vectoriel'},
  {value: 'vector', label: 'Plan OpenMapTiles'}
]

const MapStyleMenu = ({value, onChange}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = event => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className='relative shrink-0'>
      <button
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label='Choisir le fond de carte'
        className='fr-btn fr-btn--secondary fr-btn--sm fr-icon-stack-line bg-white shadow-sm'
        title='Choisir le fond de carte'
        type='button'
        onClick={() => setOpen(current => !current)}
      />

      {open && (
        <div className='absolute bottom-[calc(100%+0.25rem)] left-0 w-[230px] border border-gray-300 bg-white py-1 shadow-md' role='menu'>
          {MAP_STYLES.map(option => {
            const active = option.value === value

            return (
              <button
                key={option.value}
                aria-checked={active}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#000091] ${active ? 'font-semibold text-[#000091]' : ''}`}
                role='menuitemradio'
                type='button'
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
                {active && <span aria-hidden='true' className='fr-icon-check-line text-sm' />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MapStyleMenu
