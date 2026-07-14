import {normalizeString} from '@/utils/string.js'

function compactSearchValue(value) {
  return normalizeString(value).replaceAll(/[^a-z\d]/g, '')
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
  const queries = getIdentifierAwareSearchQueries(inputValue)
  const filteredOptions = queries.length === 0
    ? options
    : options.filter(option => {
      const searchText = getSearchableOptionText(option)
      const compactSearchText = compactSearchValue(searchText)

      return queries.some(query => searchText.includes(query) || compactSearchText.includes(query))
    })

  return limit ? filteredOptions.slice(0, limit) : filteredOptions
}
