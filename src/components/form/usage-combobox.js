'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {createPortal} from 'react-dom'

import {matchesSearchTerms} from '@/lib/search-options.js'

const MOBILE_USAGE_DROPDOWN_MEDIA_QUERY = '(max-width: 47.999rem)'

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

function getUsageCodeSortParts(option) {
  const match = /^(\d+)(\D.*)?$/u.exec(option.code ?? '')

  return {
    number: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
    suffix: match?.[2] ?? '',
    label: option.label ?? ''
  }
}

export function compareUsageOptions(left, right) {
  const leftParts = getUsageCodeSortParts(left)
  const rightParts = getUsageCodeSortParts(right)

  return leftParts.number - rightParts.number
    || leftParts.suffix.localeCompare(rightParts.suffix, 'fr', {numeric: true})
    || leftParts.label.localeCompare(rightParts.label, 'fr')
}

export function formatUsageOptionLabel(option) {
  return option.label || option.code || ''
}

function getUsageOptionSearchText(option) {
  return [
    option.code,
    option.label,
    option.parentUsage?.code,
    option.parentUsage?.label
  ].filter(Boolean).join(' ')
}

function formatUsageParentLabel(parentUsage) {
  return parentUsage?.label || parentUsage?.code || ''
}

function getUsageOptionColor(option) {
  return option.parentUsage?.color ?? option.color
}

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('fr-FR')
}

export function findUsageOptionById(usageOptions, usageId) {
  return usageOptions.find(option => option.value === usageId) ?? null
}

function findUsageOptionBySearchValue(usageOptions, value) {
  const normalizedValue = normalizeSearchText(value)

  if (!normalizedValue) {
    return null
  }

  return usageOptions.find(option => [
    option.code,
    option.label,
    formatUsageOptionLabel(option)
  ].some(label => normalizeSearchText(label) === normalizedValue)) ?? null
}

function getUsageComboboxDropdownStyle(input) {
  if (!input) {
    return null
  }

  const rect = input.getBoundingClientRect()
  const horizontalMargin = 8
  const verticalMargin = 12
  const dropdownGap = 4
  const viewportWidth = document.documentElement.clientWidth
  const width = Math.min(rect.width, viewportWidth - (horizontalMargin * 2))
  const availableBelow = window.innerHeight - rect.bottom - verticalMargin
  const availableAbove = rect.top - verticalMargin
  const openAbove = availableBelow < 220 && availableAbove > availableBelow
  const availableHeight = openAbove ? availableAbove : availableBelow
  const maxHeight = Math.max(160, Math.min(360, availableHeight - dropdownGap))
  const top = openAbove
    ? Math.max(verticalMargin, rect.top - maxHeight - dropdownGap)
    : rect.bottom + dropdownGap
  const left = Math.min(
    Math.max(horizontalMargin, rect.left),
    Math.max(horizontalMargin, viewportWidth - width - horizontalMargin)
  )

  return {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  }
}

function shouldUseInlineUsageDropdown() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_USAGE_DROPDOWN_MEDIA_QUERY).matches
}

const UsageCombobox = ({
  id,
  name,
  onFocus,
  onUsageChange,
  options,
  readOnly = false,
  disabled = false,
  required = false,
  invalid = false,
  describedBy: fieldDescriptionId,
  selectedValue,
  value,
  warning
}) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isInlineDropdown, setIsInlineDropdown] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listboxRef = useRef(null)
  const unavailable = readOnly || disabled
  const normalizedSearch = normalizeSearchText(value)
  const selectedUsage = selectedValue === undefined ? findUsageOptionBySearchValue(options, value) : findUsageOptionById(options, selectedValue)
  const parentDescriptionId = selectedUsage?.parentUsage ? `${id}-parent-usage` : undefined
  const warningId = warning ? `${id}-warning` : undefined
  const describedBy = [fieldDescriptionId, parentDescriptionId, warningId].filter(Boolean).join(' ') || undefined
  const visibleOptions = useMemo(() => {
    if (!isFiltering || !normalizedSearch) {
      return options
    }

    return options.filter(option => matchesSearchTerms(getUsageOptionSearchText(option), normalizedSearch))
  }, [isFiltering, normalizedSearch, options])
  const visibleParentCodes = new Set(visibleOptions.filter(option => !option.parentUsage).map(option => option.code))

  const updateDropdownPosition = useCallback(() => {
    const useInlineDropdown = shouldUseInlineUsageDropdown()

    setIsInlineDropdown(useInlineDropdown)
    setDropdownStyle(useInlineDropdown ? null : getUsageComboboxDropdownStyle(inputRef.current))
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleClickOutside = event => {
      if (
        !containerRef.current?.contains(event.target)
        && !listboxRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    document.addEventListener('scroll', updateDropdownPosition, true)

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      document.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [open, updateDropdownPosition])

  useEffect(() => {
    const selectedIndex = selectedUsage
      ? visibleOptions.findIndex(option => option.value === selectedUsage.value)
      : -1

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [selectedUsage, visibleOptions])

  useEffect(() => {
    if (!open) {
      return
    }

    listboxRef.current
      ?.querySelector(`[data-option-index="${CSS.escape(String(activeIndex))}"]`)
      ?.scrollIntoView({block: 'nearest'})
  }, [activeIndex, open])

  const openDropdown = useCallback(({filter = false} = {}) => {
    if (unavailable) return
    setIsFiltering(filter)
    updateDropdownPosition()
    setOpen(true)
  }, [unavailable, updateDropdownPosition])

  const selectUsage = useCallback(usage => {
    if (unavailable) return
    onUsageChange({
      usageId: usage.value,
      usageSearch: formatUsageOptionLabel(usage)
    })
    setIsFiltering(false)
    setOpen(false)
  }, [onUsageChange, unavailable])

  const listbox = !unavailable && open && (isInlineDropdown || dropdownStyle) && (
    <div
      ref={listboxRef}
      id={`${id}-listbox`}
      className={classNames(
        'quick-declaration-usage-listbox z-[1200] overflow-auto border border-gray-300 bg-white shadow-lg',
        isInlineDropdown ? 'absolute right-0 left-0 top-full mt-1 max-h-64' : 'fixed'
      )}
      role='listbox'
      style={isInlineDropdown ? undefined : dropdownStyle}
    >
      {visibleOptions.length > 0 ? visibleOptions.map((usage, index) => {
        const isActive = index === activeIndex
        const isSelected = usage.value === selectedUsage?.value
        const showParentContext = usage.parentUsage && !visibleParentCodes.has(usage.parentUsage.code)

        return (
          <button
            key={usage.value}
            id={`${id}-option-${index}`}
            data-option-index={index}
            data-usage-level={usage.parentUsage ? 'child' : 'parent'}
            type='button'
            role='option'
            tabIndex={-1}
            aria-label={usage.parentUsage ? `${formatUsageOptionLabel(usage)} — ${formatUsageParentLabel(usage.parentUsage)}` : undefined}
            aria-selected={isSelected}
            className={classNames(
              'flex w-full cursor-pointer items-start gap-1.5 border-b border-gray-100 px-2 py-2 text-left text-xs last:border-b-0',
              isActive ? 'bg-blue-50 text-blue-900' : 'bg-white hover:bg-gray-50',
              isSelected && 'font-semibold',
              !usage.parentUsage && 'font-semibold'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={event => {
              event.preventDefault()
              selectUsage(usage)
            }}
          >
            <span className='inline-flex h-4 w-3 shrink-0 items-center justify-center' aria-hidden='true'>
              {isSelected && <span className='fr-icon-check-line text-[#18753c]' />}
            </span>
            <span className={classNames(
              'flex min-w-0 flex-1 items-start gap-2',
              usage.parentUsage && 'ml-4 border-l border-gray-300 pl-3'
            )}
            >
              <span
                className={classNames(
                  'mt-[0.2rem] shrink-0 rounded-xs ring-1 ring-inset ring-black/15',
                  usage.parentUsage ? 'h-2 w-2' : 'h-2.5 w-2.5'
                )}
                style={{backgroundColor: getUsageOptionColor(usage)}}
                aria-hidden='true'
              />
              <span className='min-w-0'>
                {showParentContext && (
                  <span className='block text-[0.66rem] font-normal text-gray-600'>
                    {formatUsageParentLabel(usage.parentUsage)}
                  </span>
                )}
                <span className='quick-declaration-usage-option-label block' title={formatUsageOptionLabel(usage)}>
                  {formatUsageOptionLabel(usage)}
                </span>
              </span>
            </span>
          </button>
        )
      }) : (
        <p className='fr-hint-text fr-mb-0 px-3 py-2 text-sm'>Aucun usage trouvé.</p>
      )}
    </div>
  )
  const activeDescendant = !unavailable && open && visibleOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined

  return (
    <div ref={containerRef} className='quick-declaration-combobox'>
      <div className='relative'>
        {selectedUsage && (
          <span
            className='pointer-events-none absolute left-2 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-xs ring-1 ring-inset ring-black/15'
            style={{backgroundColor: getUsageOptionColor(selectedUsage)}}
            aria-hidden='true'
          />
        )}
        <input
          ref={inputRef}
          id={id}
          name={name}
          className={classNames(
            'fr-input quick-declaration-control quick-declaration-combobox-input text-xs',
            selectedUsage && 'quick-declaration-combobox-input--with-color'
          )}
          type='text'
          role='combobox'
          readOnly={readOnly}
          disabled={disabled}
          aria-readonly={readOnly}
          aria-required={required}
          aria-invalid={invalid}
          aria-autocomplete='list'
          aria-activedescendant={activeDescendant}
          aria-expanded={!unavailable && open}
          aria-controls={`${id}-listbox`}
          aria-haspopup='listbox'
          aria-describedby={describedBy}
          value={value}
          placeholder='Rechercher'
          autoComplete='off'
          onFocus={event => {
            if (unavailable) return
            onFocus?.()
            event.target.select()
            openDropdown({filter: false})
          }}
          onChange={event => {
            if (unavailable) return
            const usageSearch = event.target.value
            const selectedUsage = findUsageOptionBySearchValue(options, usageSearch)

            onUsageChange({
              usageSearch,
              usageId: selectedUsage?.value ?? ''
            })
            openDropdown({filter: true})
          }}
          onKeyDown={event => {
            if (unavailable) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              openDropdown({filter: open ? isFiltering : false})
              setActiveIndex(index => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)))
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              openDropdown({filter: open ? isFiltering : false})
              setActiveIndex(index => Math.max(index - 1, 0))
            }

            if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
              event.preventDefault()
              selectUsage(visibleOptions[activeIndex])
            }

            if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <button
          type='button'
          disabled={readOnly || disabled}
          tabIndex={-1}
          className='quick-declaration-combobox-toggle fr-icon-arrow-down-s-line'
          aria-label={open ? 'Fermer la liste des usages' : 'Ouvrir la liste des usages'}
          onMouseDown={event => event.preventDefault()}
          onClick={() => {
            inputRef.current?.focus()
            inputRef.current?.select()

            if (open) {
              setOpen(false)
              return
            }

            openDropdown({filter: false})
          }}
        />
        {isInlineDropdown ? listbox : (typeof document === 'undefined' ? null : createPortal(listbox, document.body))}
      </div>

      {selectedUsage?.parentUsage && (
        <p
          id={parentDescriptionId}
          className='fr-mb-0 mt-1 truncate text-[0.66rem] leading-tight text-gray-600'
          title={`Usage principal : ${formatUsageParentLabel(selectedUsage.parentUsage)}`}
        >
          Usage : <span className='font-medium text-gray-800'>{formatUsageParentLabel(selectedUsage.parentUsage)}</span>
        </p>
      )}

      {warning && (
        <p id={warningId} className='fr-hint-text fr-mb-0 mt-2 text-[0.72rem] leading-tight text-orange-700'>
          {warning}
        </p>
      )}
    </div>
  )
}

export default UsageCombobox
