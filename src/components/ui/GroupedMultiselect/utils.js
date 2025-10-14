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
