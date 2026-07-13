import {isArray, isString, isEmpty} from 'lodash-es'

// Normalise les options pour gérer les trois formats possibles
export const normalizeOptions = options => {
  if (isArray(options) && (isString(options[0]) || isOptionObject(options[0]))) {
    return [{label: null, options}]
  }

  return options
}

// Détecte si c'est un objet {value, content}
export const isOptionObject = opt =>
  opt && typeof opt === 'object' && 'value' in opt && 'content' in opt

// Pour obtenir la valeur d'une option (string ou objet)
export const getOptionValue = opt =>
  isOptionObject(opt) ? opt.value : opt

// Pour obtenir le contenu à afficher dans la liste
export const getOptionContent = opt =>
  isOptionObject(opt) ? opt.content : opt

export const getOptionDisabled = opt =>
  isOptionObject(opt) ? Boolean(opt.disabled) : false

export const getOptionTitle = opt => {
  if (!isOptionObject(opt)) {
    return undefined
  }

  return opt.disabledReason ?? opt.title ?? opt.tooltip
}

export const getOptionLabel = opt => {
  if (!isOptionObject(opt)) {
    return opt
  }

  return opt.label ?? opt.title ?? opt.tooltip ?? opt.value
}

// Affiche le texte des éléments sélectionnés, avec "+ n autres" si besoin
export const renderSelectedText = (value, placeholder, showMore, hiddenCount) => {
  if (isEmpty(value)) {
    return <span>{placeholder}</span>
  }

  if (value.length === 1 || !showMore) {
    return value.join(', ')
  }

  const visibleCount = Math.min(value.length, Math.max(1, value.length - hiddenCount))
  const visibleItems = value.slice(0, visibleCount)
  const resolvedHiddenCount = value.length - visibleCount

  if (resolvedHiddenCount === 0) {
    return visibleItems.join(', ')
  }

  return `${visibleItems.join(', ')} + ${resolvedHiddenCount} autre${resolvedHiddenCount > 1 ? 's' : ''}`
}
