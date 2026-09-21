import {
  useState, useRef, useEffect, useCallback, useId, useMemo
} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import Input from '@codegouvfr/react-dsfr/Input'
import {Box, List, ListItem} from '@mui/material'
import {xor} from 'lodash-es'

import './index.css'
import {matchesSearchTerms} from '@/lib/search-options.js'
import {areSameSelections, updateVisibleSelection} from './selection.js'

import {
  normalizeOptions,
  renderSelectedText,
  getOptionValue,
  getOptionContent,
  getOptionDisabled,
  getOptionLabel,
  getOptionTitle
} from './utils.js'

const focusWithoutScroll = element => {
  try {
    element.focus({preventScroll: true})
  } catch {
    element.focus()
  }
}

const GroupedMultiselect = ({
  value = [],
  id,
  label,
  hint,
  placeholder,
  options = [],
  onChange,
  disabled,
  searchable = false,
  confirmSelection = false,
  showSelectionActions = false,
  minSelected = 0,
  minSelectionMessage,
  hideLabel = false,
  state = 'default',
  stateRelatedMessage = null
}) => {
  const generatedId = useId()
  const selectId = id ?? `grouped-multiselect-${generatedId}`
  const listboxId = `${selectId}-listbox`
  const stateDescriptionId = `${selectId}-desc`
  const selectionDescriptionId = `${selectId}-selection-desc`
  const searchLabel = label
    ? `Rechercher dans ${label.toLocaleLowerCase('fr-FR')}`
    : 'Rechercher dans les options'
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [search, setSearch] = useState('')
  const [draftValue, setDraftValue] = useState(value)

  const ref = useRef(null)
  const selectRef = useRef(null)
  const searchInputRef = useRef(null)
  const optionRefs = useRef([])
  const wasOpenRef = useRef(false)
  const restoreFocusOnCloseRef = useRef(false)

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])
  const currentValue = confirmSelection && open ? draftValue : value
  const selectedValues = useMemo(() => new Set(currentValue), [currentValue])
  const selectionTooSmall = selectedValues.size < minSelected
  const selectionChanged = !areSameSelections(currentValue, value)

  const closeSelect = useCallback((restoreFocus = false) => {
    restoreFocusOnCloseRef.current = restoreFocus
    setOpen(false)
    setFocusedIndex(-1)
  }, [])

  const openSelect = useCallback(() => {
    if (disabled) {
      return
    }

    setDraftValue([...value])
    if (confirmSelection) {
      setSearch('')
    }

    setOpen(true)
    setFocusedIndex(searchable ? -1 : 0)
  }, [disabled, value, confirmSelection, searchable])

  const valueLabelMap = useMemo(() => {
    const map = new Map()

    for (const group of normalizedOptions) {
      for (const option of group.options || []) {
        map.set(
          getOptionValue(option),
          getOptionLabel(option) || getOptionValue(option)
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

    if (!search.trim()) {
      return normalizedOptions
    }

    return normalizedOptions
      .map(group => ({
        ...group,
        options: group.options.filter(option => {
          const searchableValue = [
            getOptionContent(option),
            getOptionLabel(option),
            getOptionTitle(option),
            getOptionValue(option)
          ].filter(Boolean).join(' ')

          return matchesSearchTerms(searchableValue, search)
        })
      }))
      .filter(group => group.options.length > 0)
  }, [normalizedOptions, search, searchable])

  useEffect(() => {
    const handleClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        closeSelect()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeSelect])

  useEffect(() => {
    if (disabled && open) {
      closeSelect()
    }
  }, [disabled, open, closeSelect])

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

    const visibleCount = Math.max(1, left)
    const hidden = selectedDisplayValues.length - visibleCount
    setHiddenCount(hidden)
    setShowMore(hidden > 0)
  }, [selectedDisplayValues])

  const toggleOption = useCallback(option => {
    if (disabled || getOptionDisabled(option)) {
      return
    }

    const optionValue = getOptionValue(option)
    if (confirmSelection) {
      setDraftValue(current => xor(current, [optionValue]))
    } else {
      onChange?.(xor(value, [optionValue]))
    }
  }, [disabled, confirmSelection, value, onChange])

  const flatOptions = useMemo(() =>
    filteredOptions.flatMap(group =>
      group.options.map(option => ({
        label: group.label,
        option
      }))
    ), [filteredOptions])

  const groupOffsets = useMemo(() => {
    let offset = 0
    return filteredOptions.map(group => {
      const start = offset
      offset += group.options.length
      return start
    })
  }, [filteredOptions])

  const enabledVisibleValues = useMemo(() => [...new Set(flatOptions
    .filter(({option}) => !getOptionDisabled(option))
    .map(({option}) => getOptionValue(option)))], [flatOptions])
  const allVisibleSelected = enabledVisibleValues.every(optionValue => selectedValues.has(optionValue))
  const anyVisibleSelected = enabledVisibleValues.some(optionValue => selectedValues.has(optionValue))
  const filteredSelection = searchable && search.trim().length > 0

  const selectVisible = selected => {
    if (disabled) {
      return
    }

    if (confirmSelection) {
      setDraftValue(current => updateVisibleSelection(current, enabledVisibleValues, selected))
    } else {
      const nextValue = updateVisibleSelection(value, enabledVisibleValues, selected)
      if (!areSameSelections(nextValue, value)) {
        onChange?.(nextValue)
      }
    }
  }

  const applySelection = () => {
    if (disabled || selectionTooSmall || !selectionChanged) {
      return
    }

    closeSelect(true)
    onChange?.([...currentValue])
  }

  const handleKeyDown = useCallback(e => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        openSelect()
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
        setFocusedIndex(i => searchable && i === 0 ? -1 : Math.max(i - 1, 0))
        e.preventDefault()
        break
      }

      case 'Home':
      case 'End': {
        setFocusedIndex(e.key === 'Home' ? 0 : flatOptions.length - 1)
        e.preventDefault()
        break
      }

      case 'Enter':
      case ' ': {
        if (e.currentTarget === selectRef.current) {
          closeSelect(true)
          e.preventDefault()
          break
        }

        if (focusedIndex >= 0 && flatOptions[focusedIndex]) {
          toggleOption(flatOptions[focusedIndex].option)
        }

        e.preventDefault()
        break
      }

      case 'Escape': {
        closeSelect(true)
        e.preventDefault()
        e.stopPropagation()
        break
      }

      default: {
        break
      }
    }
  }, [open, openSelect, closeSelect, toggleOption, flatOptions, focusedIndex, searchable])

  useEffect(() => {
    if (!open && !wasOpenRef.current) {
      return
    }

    if (open && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      focusWithoutScroll(optionRefs.current[focusedIndex])
      optionRefs.current[focusedIndex].scrollIntoView({block: 'nearest'})
      wasOpenRef.current = true
    } else if (open && searchable && searchInputRef.current) {
      focusWithoutScroll(searchInputRef.current)
      wasOpenRef.current = true
    } else if (!open) {
      if (restoreFocusOnCloseRef.current && selectRef.current) {
        focusWithoutScroll(selectRef.current)
      }

      restoreFocusOnCloseRef.current = false
    }

    wasOpenRef.current = open
  }, [open, focusedIndex, searchable])

  const totalOptionsCount = useMemo(
    () => filteredOptions.reduce((acc, group) => acc + group.options.length, 0),
    [filteredOptions]
  )

  return (
    <div
      ref={ref}
      style={{position: 'relative'}}
      className={[
        disabled ? 'fr-select-group--disabled' : '',
        state === 'default' ? '' : `fr-select-group--${state}`
      ].filter(Boolean).join(' ')}
      onBlur={event => {
        // Bulk actions can disable the focused button and blur it without
        // moving focus outside. Actual outside clicks are handled separately.
        if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          closeSelect()
        }
      }}
    >
      <label className={hideLabel ? 'sr-only' : 'fr-label'} htmlFor={selectId}>{label}</label>
      {hint && <span className='fr-hint-text'>{hint}</span>}

      <Box
        ref={selectRef}
        id={selectId}
        className={`fr-select${hideLabel ? '' : ' mt-2'}${disabled ? ' fr-bg-disabled-grey' : ''}`}
        aria-disabled={disabled}
        aria-controls={listboxId}
        aria-describedby={state !== 'default' && stateRelatedMessage ? stateDescriptionId : undefined}
        aria-label={label || placeholder || 'Sélection multiple'}
        sx={{
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        aria-haspopup='listbox'
        aria-expanded={open}
        role='button'
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : () => open ? closeSelect(true) : openSelect()}
        onKeyDown={disabled ? undefined : handleKeyDown}
      >
        <Box sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {renderSelectedText(selectedDisplayValues, placeholder, showMore, hiddenCount)}
        </Box>
      </Box>

      {open && (
        <Box
          className='grouped-multiselect-popup'
          sx={{
            position: 'absolute',
            backgroundColor: fr.colors.decisions.background.default.grey.default,
            top: '100%',
            left: 0,
            right: 0,
            border: `1px solid ${fr.colors.decisions.background.contrast.grey.default}`,
            zIndex: 10,
            padding: 0,
            maxHeight: 'min(440px, 65vh)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              closeSelect(true)
              event.preventDefault()
              event.stopPropagation()
            }
          }}
        >
          {searchable && (
            <Box sx={{padding: 1}}>
              <Input
                label=''
                nativeInputProps={{
                  ref: searchInputRef,
                  'aria-controls': listboxId,
                  'aria-label': searchLabel,
                  value: search,
                  onChange(e) {
                    setSearch(e.target.value)
                    setFocusedIndex(-1)
                  },
                  placeholder: 'Rechercher...',
                  onKeyDown(e) {
                    if (e.key === 'Enter') {
                      // Searching must never submit a surrounding form.
                      e.preventDefault()
                    } else if (e.key === 'ArrowDown') {
                      if (flatOptions.length > 0) {
                        setFocusedIndex(0)
                      }

                      e.preventDefault()
                    } else if (e.key === 'Escape') {
                      closeSelect(true)
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }
                }}
              />
            </Box>
          )}

          {showSelectionActions && (
            <div className='grouped-multiselect-actions'>
              <button
                type='button'
                className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
                disabled={disabled || enabledVisibleValues.length === 0 || allVisibleSelected}
                onClick={() => selectVisible(true)}
              >
                {filteredSelection ? 'Sélectionner les résultats' : 'Tout sélectionner'}
              </button>
              <button
                type='button'
                className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
                disabled={disabled || !anyVisibleSelected}
                onClick={() => selectVisible(false)}
              >
                {filteredSelection ? 'Désélectionner les résultats' : 'Tout désélectionner'}
              </button>
            </div>
          )}

          <List
            component='div'
            id={listboxId}
            role='listbox'
            aria-label={label || placeholder || 'Sélection multiple'}
            aria-multiselectable='true'
            tabIndex={-1}
            sx={{padding: 0, minHeight: 0, overflowY: 'auto', maxHeight: 300}}
          >

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
              <Box key={group.label || `group-${groupIdx}`} role={group.label ? 'group' : undefined} aria-label={group.label || undefined}>
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
                  const flatIdx = groupOffsets[groupIdx] + optIdx

                  const optionValue = getOptionValue(option)
                  const isSelected = selectedValues.has(optionValue)
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
                      tabIndex={focusedIndex === flatIdx ? 0 : -1}
                      title={tooltip}
                      onFocus={() => setFocusedIndex(flatIdx)}
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
          {confirmSelection && (
            <div className='grouped-multiselect-footer'>
              <p id={selectionDescriptionId} className='fr-text--xs fr-mb-0' role='status'>
                {selectionTooSmall
                  ? minSelectionMessage || (minSelected === 1 ? 'Sélectionnez au moins une option.' : `Sélectionnez au moins ${minSelected} options.`)
                  : `${selectedValues.size} sélectionné${selectedValues.size > 1 ? 's' : ''}`}
              </p>
              <div className='grouped-multiselect-footer-buttons'>
                <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' onClick={() => closeSelect(true)}>
                  Annuler
                </button>
                <button
                  type='button'
                  className='fr-btn fr-btn--sm'
                  disabled={disabled || selectionTooSmall || !selectionChanged}
                  aria-describedby={selectionDescriptionId}
                  onClick={applySelection}
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}
        </Box>
      )}

      {state !== 'default' && stateRelatedMessage && (
        <p
          id={stateDescriptionId}
          className={state === 'error' ? 'fr-error-text' : 'fr-info-text'}
          role={state === 'error' ? 'alert' : undefined}
        >
          {stateRelatedMessage}
        </p>
      )}
    </div>
  )
}

export default GroupedMultiselect
