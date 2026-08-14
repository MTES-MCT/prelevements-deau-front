import {getIdentifierAwareSearchQueries} from '@/lib/search-options.js'
import {normalizeString} from '@/utils/string.js'

function getDeclarantRole(preleveur) {
  return preleveur?.declarant?.declarantRole || preleveur?.declarantRole || 'PRELEVEUR'
}

function getSearchTexts(preleveur) {
  const declarant = preleveur?.declarant || preleveur || {}
  const searchText = normalizeString([
    preleveur?.email,
    preleveur?.firstName,
    preleveur?.lastName,
    declarant.socialReason,
    declarant.phoneNumber,
    declarant.city,
    declarant.siret
  ].filter(Boolean).join(' '))

  return {
    searchText,
    compactSearchText: searchText.replaceAll(/[^a-z\d]/g, '')
  }
}

function matchesQuery(preleveur, query) {
  const queries = getIdentifierAwareSearchQueries(query)

  if (queries.length === 0) {
    return true
  }

  const {searchText, compactSearchText} = getSearchTexts(preleveur)
  return queries.some(searchQuery => {
    const matchesText = searchQuery
      .split(' ')
      .every(searchTerm => searchText.includes(searchTerm))

    return matchesText || compactSearchText.includes(searchQuery)
  })
}

export function searchCollecteurPreleveurs(preleveurs = [], {
  emailStatus = null,
  page = 1,
  pageSize = 10,
  query = '',
  role = null
} = {}) {
  const source = Array.isArray(preleveurs) ? preleveurs : []
  const items = source.filter(preleveur => {
    if (role && getDeclarantRole(preleveur) !== role) {
      return false
    }

    if (emailStatus === 'WITH_EMAIL' && !preleveur.email) {
      return false
    }

    if (emailStatus === 'WITHOUT_EMAIL' && preleveur.email) {
      return false
    }

    return matchesQuery(preleveur, query)
  })
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const offset = (page - 1) * pageSize

  return {
    items: items.slice(offset, offset + pageSize),
    total: items.length,
    page,
    pageSize,
    totalPages,
    counts: {
      total: source.length,
      preleveurs: source.filter(preleveur => getDeclarantRole(preleveur) === 'PRELEVEUR').length,
      collecteurs: source.filter(preleveur => getDeclarantRole(preleveur) === 'COLLECTEUR').length,
      withoutEmail: source.filter(preleveur => !preleveur.email).length
    }
  }
}
