import {
  useState, useRef, useEffect, useCallback, useMemo
} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import Input from '@codegouvfr/react-dsfr/Input'
import {Box, List, ListItem} from '@mui/material'
import {xor} from 'lodash-es'

import './index.css'
import {
  normalizeOptions,
  renderSelectedText,
  getOptionValue,
  getOptionContent,
  getOptionDisabled,
  getOptionTitle
} from './utils.js'

const GroupedMultiselect = ({
  value = [],
  label,
  hint,
  placeholder,
  options = [],
  onChange,
  disabled,
  searchable = false
}) => {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [search, setSearch] = useState('')

  const ref = useRef(null)
  const selectRef = useRef(null)
  const searchInputRef = useRef(null)
  const optionRefs = useRef([])

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])

  const valueLabelMap = useMemo(() => {
    const map = new Map()

    for (const group of normalizedOptions) {
      for (const option of group.options || []) {
        map.set(
          getOptionValue(option),
          getOptionTitle(option) || getOptionValue(option)
        )
      }
    }

    return map
  }, [normalizedOptions])

  const selectedDisplayValues = useMemo(
    () => value.map(selectedValue => valueLabelMap.get(selectedValue) ?? selectedValue),
    [value, valueLabelMap]
  )

  const filteredOptions = useMemo(() => {
    if (!searchable) {
      return normalizedOptions
    }

    const query = search.trim().toLowerCase()

    if (!query) {
      return normalizedOptions
    }

    return normalizedOptions
      .map(group => ({
        ...group,
        options: group.options.filter(option => {
          const content = String(getOptionContent(option) || '').toLowerCase()
          const title = String(getOptionTitle(option) || '').toLowerCase()
          const optionValue = String(getOptionValue(option) || '').toLowerCase()

          return content.includes(query) || title.includes(query) || optionValue.includes(query)
        })
      }))
      .filter(group => group.options.length > 0)
  }, [normalizedOptions, search, searchable])

  useEffect(() => {
    const handleClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selectRef.current) {
      setHiddenCount(0)
      setShowMore(false)
      return
    }

    if (selectedDisplayValues.length <= 1) {
      setHiddenCount(0)
      setShowMore(false)
      return
    }

    const containerWidth = selectRef.current.offsetWidth - 24
    const computedStyle = window.getComputedStyle(selectRef.current)
    const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setHiddenCount(0)
      setShowMore(false)
      return
    }

    ctx.font = font

    let left = 0
    let right = selectedDisplayValues.length

    while (left < right) {
      const mid = Math.ceil((left + right) / 2)
      let text = selectedDisplayValues.slice(0, mid).join(', ')
      const hidden = selectedDisplayValues.length - mid

      if (hidden > 0) {
        text += ` + ${hidden} autre${hidden > 1 ? 's' : ''}`
      }

      if (ctx.measureText(text).width <= containerWidth) {
        left = mid
      } else {
        right = mid - 1
      }
    }

    const visibleCount = left
    const hidden = selectedDisplayValues.length - visibleCount
    setHiddenCount(hidden)
    setShowMore(hidden > 0)
  }, [selectedDisplayValues])

  const toggleOption = useCallback(option => {
    if (getOptionDisabled(option)) {
      return
    }

    const optionValue = getOptionValue(option)
    const newValue = xor(value, [optionValue])
    onChange?.(newValue)
  }, [value, onChange])

  const flatOptions = useMemo(() =>
    filteredOptions.flatMap(group =>
      group.options.map(option => ({
        label: group.label,
        option
      }))
    ), [filteredOptions])

  const handleKeyDown = useCallback(e => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        setOpen(true)
        setFocusedIndex(0)
        e.preventDefault()
      }

      return
    }

    switch (e.key) {
      case 'ArrowDown': {
        setFocusedIndex(i => Math.min(i + 1, flatOptions.length - 1))
        e.preventDefault()
        break
      }

      case 'ArrowUp': {
        setFocusedIndex(i => Math.max(i - 1, 0))
        e.preventDefault()
        break
      }

      case 'Enter':
      case ' ': {
        if (focusedIndex >= 0 && flatOptions[focusedIndex]) {
          toggleOption(flatOptions[focusedIndex].option)
        }

        e.preventDefault()
        break
      }

      case 'Escape': {
        setOpen(false)
        setFocusedIndex(-1)
        e.preventDefault()
        break
      }

      default: {
        break
      }
    }
  }, [open, toggleOption, flatOptions, focusedIndex])

  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
      return
    }

    if (open && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({block: 'nearest'})
    } else if (!open && selectRef.current) {
      selectRef.current.focus()
    }
  }, [open, focusedIndex, searchable])

  const totalOptionsCount = useMemo(
    () => filteredOptions.reduce((acc, group) => acc + group.options.length, 0),
    [filteredOptions]
  )

  return (
    <div
      ref={ref}
      style={{position: 'relative'}}
      className={disabled ? 'fr-select-group--disabled' : ''}
    >
      <label className='fr-label' htmlFor='selector'>{label}</label>
      {hint && <span className='fr-hint-text'>{hint}</span>}

      <Box
        ref={selectRef}
        id='selector'
        className={`fr-select mt-2${disabled ? ' fr-bg-disabled-grey' : ''}`}
        aria-disabled={disabled}
        sx={{
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        aria-haspopup='listbox'
        aria-expanded={open}
        role='button'
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : () => setOpen(prev => !prev)}
        onKeyDown={disabled ? undefined : handleKeyDown}
      >
        <Box sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {renderSelectedText(selectedDisplayValues, placeholder, showMore, hiddenCount)}
        </Box>
      </Box>

      {open && (
        <List
          sx={{
            position: 'absolute',
            backgroundColor: fr.colors.decisions.background.default.grey.default,
            top: '100%',
            left: 0,
            right: 0,
            border: `1px solid ${fr.colors.decisions.background.contrast.grey.default}`,
            zIndex: 10,
            padding: 0,
            maxHeight: 300,
            overflowY: 'auto'
          }}
          role='listbox'
          tabIndex={-1}
        >
          {searchable && (
            <Box sx={{padding: 1}}>
              <Input
                ref={searchInputRef}
                label=''
                nativeInputProps={{
                  value: search,
                  onChange(e) {
                    setSearch(e.target.value)
                    setFocusedIndex(0)
                  },
                  placeholder: 'Rechercher...',
                  onKeyDown(e) {
                    if (e.key === 'ArrowDown') {
                      setFocusedIndex(0)
                      e.preventDefault()
                    } else if (e.key === 'Escape') {
                      setOpen(false)
                      setFocusedIndex(-1)
                      e.preventDefault()
                    }
                  }
                }}
              />
            </Box>
          )}

          {totalOptionsCount === 0 && (
            <ListItem
              sx={{
                color: fr.colors.decisions.text.mention.grey.default
              }}
              tabIndex={-1}
            >
              Aucune option
            </ListItem>
          )}

          {filteredOptions.map((group, groupIdx) => (
            <Box key={group.label || `group-${groupIdx}`}>
              {group?.label && (
                <ListItem
                  sx={{
                    background: fr.colors.decisions.artwork.major.blueFrance.default,
                    fontWeight: 500,
                    color: fr.colors.decisions.background.default.grey.default
                  }}
                  tabIndex={-1}
                >
                  {group.label}
                </ListItem>
              )}

              {group.options.map((option, optIdx) => {
                const flatIdx = filteredOptions
                  .slice(0, groupIdx)
                  .reduce((acc, g) => acc + g.options.length, 0) + optIdx

                const optionValue = getOptionValue(option)
                const isSelected = value.includes(optionValue)
                const isDisabled = getOptionDisabled(option)
                const tooltip = getOptionTitle(option)

                return (
                  <ListItem
                    key={optionValue}
                    ref={el => {
                      optionRefs.current[flatIdx] = el
                    }}
                    aria-disabled={isDisabled}
                    aria-selected={isSelected}
                    className={`list-item selector-option${isSelected ? ' selected' : ''}${focusedIndex === flatIdx ? ' focused' : ''}${isDisabled ? ' disabled' : ''} p-2 radius-4`}
                    role='option'
                    tabIndex={-1}
                    title={tooltip}
                    onClick={isDisabled ? undefined : () => toggleOption(option)}
                    onKeyDown={handleKeyDown}
                  >
                    {isSelected && (
                      <span aria-hidden className='selector-option-check mr-1'>
                        ✓
                      </span>
                    )}
                    {getOptionContent(option)}
                  </ListItem>
                )
              })}
            </Box>
          ))}
        </List>
      )}
    </div>
  )
}

export default GroupedMultiselect
