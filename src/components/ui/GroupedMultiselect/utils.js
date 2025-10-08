import {isArray, isString, isEmpty} from 'lodash-es'

// Normalise les options pour gérer les deux formats possibles
export const normalizeOptions = options => {
  if (isArray(options) && isString(options[0])) {
    return [{label: null, options}]
  }

  return options
}

// Affiche le texte des éléments sélectionnés, avec "+ n autres" si besoin
export const renderSelectedText = (value, placeholder, showMore, hiddenCount) => {
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
