import {useState, useRef, useEffect} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box, List, ListItem} from '@mui/material'
import {
  xor, isEmpty, isArray, isString
} from 'lodash-es'
import './index.css'

const normalizeOptions = options => {
  if (isArray(options) && isString(options[0])) {
    return [{label: null, options}]
  }

  return options
}

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

  const ref = useRef(null)
  const selectRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Si le select existe et qu'il y a plus d'un élément sélectionné
    if (selectRef.current && value.length > 1) {
      // On récupère la largeur disponible dans le composant (moins 24px pour le padding/icône)
      const containerWidth = selectRef.current.offsetWidth - 24
      // On récupère la police utilisée pour avoir une mesure fidèle
      const computedStyle = window.getComputedStyle(selectRef.current)
      const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      // On crée un canvas pour mesurer la largeur du texte sans manipuler le DOM
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = font

      let visibleCount = value.length
      // On cherche combien d'éléments on peut afficher avant de dépasser la largeur
      for (let i = value.length; i > 0; i--) {
        let text = value.slice(0, i).join(', ')
        const hidden = value.length - i

        if (hidden > 0) {
          text += ` + ${hidden} autre${hidden > 1 ? 's' : ''}`
        }

        // Si le texte tient dans la largeur, on s'arrête
        if (ctx.measureText(text).width <= containerWidth) {
          visibleCount = i
          break
        }
      }

      // On met à jour le nombre d'éléments cachés et l'affichage du "+ n autres"
      const hidden = value.length - visibleCount
      setHiddenCount(hidden)
      setShowMore(hidden > 0)
    } else {
      setHiddenCount(0)
      setShowMore(false)
    }
  }, [value])

  const toggleOption = option => {
    const newValue = xor(value, [option])
    onChange?.(newValue)
  }

  const renderSelectedText = () => {
    if (isEmpty(value)) {
      return <span>{placeholder}</span>
    }

    if (value.length === 1 || !showMore) {
      return value.join(', ')
    }

    const visibleCount = value.length - hiddenCount
    const visibleItems = value.slice(0, visibleCount)
    return `${visibleItems.join(', ')} + ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''}`
  }

  const normalizedOptions = normalizeOptions(options)

  return (
    <div ref={ref} style={{position: 'relative'}}>
      <label className='fr-label' htmlFor='selector'>{label}</label>
      {hint && <span className='fr-hint-text'>{hint}</span>}

      <Box
        ref={selectRef}
        className='fr-select mt-2'
        onClick={() => setOpen(prev => !prev)}
      >
        <Box sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {renderSelectedText()}
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
        >
          {normalizedOptions.map(group => (
            <Box key={group.label || 'no-label'}>
              {group?.label && (
                <ListItem sx={{background: fr.colors.decisions.background.default.grey.hover, fontWeight: '500'}}>
                  {group.label}
                </ListItem>
              )}
              {group.options.map(option => (
                <ListItem
                  key={option}
                  className={`selector-option${value.includes(option) ? ' selected' : ''} p-2 radius-4`}
                  onClick={() => toggleOption(option)}
                >
                  {option}
                </ListItem>
              ))}
            </Box>
          ))}
        </List>
      )}
    </div>
  )
}

export default GroupedMultiselect
