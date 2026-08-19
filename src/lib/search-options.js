import {normalizeString} from '@/utils/string.js'

function compactSearchValue(value) {
  return normalizeString(value).replaceAll(/[^a-z\d]/g, '')
}

function getSearchParts(query) {
  const normalizedQuery = normalizeString(query)
  const terms = normalizedQuery.split(' ').filter(Boolean)
  const digitCount = [...normalizedQuery].filter(character => /\d/.test(character)).length
  const hasIdentifierMarker = terms.some(term => /^(bss|siret)$/.test(term))
  const isIdentifierLike = digitCount >= 3 || hasIdentifierMarker

  if (!isIdentifierLike) {
    return {humanTerms: terms, identifier: null}
  }

  const identifierTerms = terms.filter(term => (
    /\d/.test(term) || /^(bss|siret)$/.test(term)
  ))

  if (identifierTerms.length === 0) {
    return {humanTerms: terms, identifier: null}
  }

  return {
    humanTerms: terms.filter(term => !identifierTerms.includes(term)),
    identifier: compactSearchValue(identifierTerms.join(' '))
  }
}

export function matchesSearchTerms(searchableValue, query) {
  const normalizedQuery = normalizeString(query)

  if (!normalizedQuery) {
    return true
  }

  const normalizedSearchableValue = normalizeString(searchableValue)
  const {humanTerms, identifier} = getSearchParts(query)
  const humanTermsMatch = humanTerms.every(term => normalizedSearchableValue.includes(term))

  return humanTermsMatch && (
    !identifier || compactSearchValue(searchableValue).includes(identifier)
  )
}

export function getIdentifierAwareSearchQueries(value) {
  const normalized = normalizeString(value)
  if (!normalized) {
    return []
  }

  const compact = compactSearchValue(value)
  const digitCount = [...normalized].filter(character => /\d/.test(character)).length
  const isIdentifierLike = digitCount >= 3 || /^(bss|siret)\b/.test(normalized)

  return isIdentifierLike && compact && compact !== normalized
    ? [normalized, compact]
    : [normalized]
}

export function getSearchableOptionText(option = {}) {
  const entity = option.point ?? option.declarant ?? option.preleveur ?? {}
  const aliases = entity.pointPrelevementNameAliases ?? []

  return [
    option.label,
    option.searchText,
    option.codeBSS,
    option.siret,
    entity.codeBSS,
    entity.siret,
    entity.declarant?.siret,
    ...aliases
  ]
    .map(value => normalizeString(value))
    .filter(Boolean)
    .join(' ')
}

export function filterSearchAutocompleteOptions(options, {inputValue}, {limit} = {}) {
  const normalizedInputValue = normalizeString(inputValue)
  const filteredOptions = normalizedInputValue
    ? options.filter(option => matchesSearchTerms(getSearchableOptionText(option), inputValue))
    : options

  return limit ? filteredOptions.slice(0, limit) : filteredOptions
}
