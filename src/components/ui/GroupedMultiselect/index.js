import {
  useState, useRef, useEffect, useCallback
} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box, List, ListItem} from '@mui/material'
import {xor} from 'lodash-es'

import './index.css'
import {normalizeOptions, renderSelectedText} from './utils.js'

const GroupedMultiselect = ({
  value = [],
  label,
  hint,
  placeholder,
  options = [],
  onChange
}) => {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const ref = useRef(null)
  const selectRef = useRef(null)
  const optionRefs = useRef([])

  // Ferme la liste si clic en dehors du composant
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

  // Calcule combien d’éléments sélectionnés peuvent être affichés sans dépasser la largeur du composant
  useEffect(() => {
    if (selectRef.current && value.length > 1) {
      const containerWidth = selectRef.current.offsetWidth - 24
      const computedStyle = window.getComputedStyle(selectRef.current)
      const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = font

      let left = 0
      let right = value.length
      let visibleCount = value.length

      while (left < right) {
        const mid = Math.ceil((left + right) / 2)
        let text = value.slice(0, mid).join(', ')
        const hidden = value.length - mid
        if (hidden > 0) {
          text += ` + ${hidden} autre${hidden > 1 ? 's' : ''}`
        }

        if (ctx.measureText(text).width <= containerWidth) {
          left = mid
        } else {
          right = mid - 1
        }
      }

      visibleCount = left
      const hidden = value.length - visibleCount
      setHiddenCount(hidden)
      setShowMore(hidden > 0)
    } else {
      setHiddenCount(0)
      setShowMore(false)
    }
  }, [value])

  // Ajoute ou retire une option de la sélection
  const toggleOption = useCallback(option => {
    const newValue = xor(value, [option])
    onChange?.(newValue)
  }, [value, onChange])

  const normalizedOptions = normalizeOptions(options)
  // Liste plate des options pour navigation clavier
  const flatOptions = normalizedOptions.flatMap(group =>
    group.options.map(option => ({
      label: group.label,
      option
    }))
  )

  // Gestion du focus clavier
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
  },
  [open, toggleOption, flatOptions, focusedIndex]
  )

  // Focus sur l'option sélectionnée
  useEffect(() => {
    if (open && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].focus()
    }
  }, [open, focusedIndex])

  return (
    <div ref={ref} style={{position: 'relative'}}>
      <label className='fr-label' htmlFor='selector'>{label}</label>
      {hint && <span className='fr-hint-text'>{hint}</span>}

      <Box
        ref={selectRef}
        id='selector'
        className='fr-select mt-2'
        tabIndex={0}
        aria-haspopup='listbox'
        aria-expanded={open}
        role='button'
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
      >
        <Box sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {renderSelectedText(value, placeholder, showMore, hiddenCount)}
        </Box>
      </Box>

      {open && (
        <List
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            border: `1px solid ${fr.colors.decisions.background.contrast.grey.default}`,
            zIndex: 10,
            padding: 0,
            maxHeight: 200,
            overflowY: 'auto'
          }}
          role='listbox'
          tabIndex={-1}
        >
          {normalizedOptions.map((group, groupIdx) => (
            <Box key={group.label || 'no-label'}>
              {group?.label && (
                <ListItem sx={{background: fr.colors.decisions.background.default.grey.hover, fontWeight: '500'}} tabIndex={-1}>
                  {group.label}
                </ListItem>
              )}
              {group.options.map((option, optIdx) => {
                // Calcul de l'index plat pour le focus
                const flatIdx = normalizedOptions
                  .slice(0, groupIdx)
                  .reduce((acc, g) => acc + g.options.length, 0) + optIdx
                return (
                  <ListItem
                    key={option}
                    ref={el => {
                      optionRefs.current[flatIdx] = el
                    }}
                    className={`selector-option${value.includes(option) ? ' selected' : ''} p-2 radius-4`}
                    tabIndex={-1}
                    role='option'
                    aria-selected={value.includes(option)}
                    onClick={() => toggleOption(option)}
                    onKeyDown={handleKeyDown}
                  >
                    {option}
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
