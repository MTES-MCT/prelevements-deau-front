import {useState, useRef, useEffect} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box, List, ListItem} from '@mui/material'
import {
  xor, isEmpty, isArray, isString
} from 'lodash-es'
import './index.css'

// Normalise les options pour gérer les deux formats possibles
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

  // Ferme la liste si clic en dehors du composant
  useEffect(() => {
    const handleClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calcule combien d’éléments sélectionnés peuvent être affichés sans dépasser la largeur du composant
  useEffect(() => {
    if (selectRef.current && value.length > 1) {
      // Largeur disponible dans le composant (on enlève un peu de marge)
      const containerWidth = selectRef.current.offsetWidth - 24
      // Récupère la police utilisée pour mesurer le texte
      const computedStyle = window.getComputedStyle(selectRef.current)
      const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      // Utilise un canvas pour mesurer la largeur du texte
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = font

      // Recherche dichotomique pour trouver le nombre max d’éléments affichables
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

        // Si le texte tient, on essaie d’en afficher plus
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
  const toggleOption = option => {
    const newValue = xor(value, [option])
    onChange?.(newValue)
  }

  // Affiche le texte des éléments sélectionnés, avec "+ n autres" si besoin
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
        id='selector'
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
