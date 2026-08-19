const collator = new Intl.Collator('fr-FR', {numeric: true, sensitivity: 'base'})

export const SEARCH_SORT_MODES = Object.freeze({
  NAME: 'NAME',
  RELEVANCE: 'RELEVANCE'
})

const SCORE = Object.freeze({
  exactIdentifier: 100_000,
  identifierPrefix: 90_000,
  identifierPartial: 80_000,
  exactPhrase: 70_000,
  phrasePrefix: 60_000,
  phrasePartial: 50_000,
  allTerms: 10_000,
  exactTerm: 1000,
  termPrefix: 820,
  termPartial: 680,
  fuzzyTerm: 480
})

export function normalizeSearchValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .replaceAll(/[^a-z\d]+/g, ' ')
    .trim()
    .replaceAll(/\s+/g, ' ')
}

export function compactSearchValue(value) {
  return normalizeSearchValue(value).replaceAll(' ', '')
}

function getFieldDefinition(field) {
  if (field && typeof field === 'object' && !Array.isArray(field) && Object.hasOwn(field, 'value')) {
    return field
  }

  return {value: field}
}

function getFieldValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap(item => getFieldValues(item))
  }

  return value === null || value === undefined ? [] : [value]
}

export function createSearchDocument(fields = []) {
  const entries = []

  for (const rawField of fields) {
    const field = getFieldDefinition(rawField)
    const weight = Number.isFinite(field.weight) ? Math.max(0, field.weight) : 1

    for (const value of getFieldValues(field.value)) {
      const text = normalizeSearchValue(value)
      if (!text) {
        continue
      }

      entries.push({
        compact: text.replaceAll(' ', ''),
        identifier: Boolean(field.identifier),
        text,
        tokens: text.split(' '),
        weight
      })
    }
  }

  return {entries}
}

function getMaximumEditDistance(token) {
  if (token.length < 4) {
    return 0
  }

  return token.length < 8 ? 1 : 2
}

function getBoundedEditDistance(left, right, maximumDistance) {
  if (left === right) {
    return 0
  }

  if (Math.abs(left.length - right.length) > maximumDistance) {
    return maximumDistance + 1
  }

  let previousPrevious = null
  let previous = Array.from({length: right.length + 1}, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    let minimum = current[0]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      let distance = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      )

      if (
        previousPrevious
        && leftIndex > 1
        && rightIndex > 1
        && left[leftIndex - 1] === right[rightIndex - 2]
        && left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distance = Math.min(distance, previousPrevious[rightIndex - 2] + 1)
      }

      current.push(distance)
      minimum = Math.min(minimum, distance)
    }

    if (minimum > maximumDistance) {
      return maximumDistance + 1
    }

    previousPrevious = previous
    previous = current
  }

  return previous[right.length]
}

function isIdentifierToken(token) {
  const digitCount = [...token].filter(character => /\d/.test(character)).length
  return digitCount >= 3 || (/\d/.test(token) && /[a-z]/.test(token))
}

function getTermMatchScore(queryToken, entryToken, {identifier, weight}) {
  const weightBonus = Math.min(weight, 20) * 10

  if (entryToken === queryToken) {
    return SCORE.exactTerm + weightBonus
  }

  if (entryToken.startsWith(queryToken)) {
    return SCORE.termPrefix + weightBonus
  }

  if (queryToken.length >= 3 && entryToken.includes(queryToken)) {
    return SCORE.termPartial + weightBonus
  }

  const maximumDistance = identifier || isIdentifierToken(queryToken)
    ? 0
    : getMaximumEditDistance(queryToken)

  if (maximumDistance === 0 || Math.abs(entryToken.length - queryToken.length) > maximumDistance) {
    return null
  }

  const distance = getBoundedEditDistance(queryToken, entryToken, maximumDistance)
  return distance <= maximumDistance
    ? SCORE.fuzzyTerm - (distance * 80) + weightBonus
    : null
}

function getIdentifierScore(entries, compactQuery) {
  if (compactQuery.length < 3) {
    return null
  }

  let bestScore = null

  for (const entry of entries) {
    if (!entry.identifier) {
      continue
    }

    const weightBonus = Math.min(entry.weight, 20) * 10
    let score = null

    if (entry.compact === compactQuery) {
      score = SCORE.exactIdentifier + weightBonus
    } else if (entry.compact.startsWith(compactQuery)) {
      score = SCORE.identifierPrefix + weightBonus
    } else if (entry.compact.includes(compactQuery)) {
      score = SCORE.identifierPartial + weightBonus
    }

    if (score !== null && (bestScore === null || score > bestScore)) {
      bestScore = score
    }
  }

  return bestScore
}

function getPhraseScore(entries, normalizedQuery) {
  let bestScore = null

  for (const entry of entries) {
    const weightBonus = Math.min(entry.weight, 20) * 10
    let score = null

    if (entry.text === normalizedQuery) {
      score = SCORE.exactPhrase + weightBonus
    } else if (entry.text.startsWith(normalizedQuery)) {
      score = SCORE.phrasePrefix + weightBonus
    } else if (entry.text.includes(normalizedQuery)) {
      score = SCORE.phrasePartial + weightBonus
    }

    if (score !== null && (bestScore === null || score > bestScore)) {
      bestScore = score
    }
  }

  return bestScore
}

function getTermsScore(entries, queryTokens) {
  let total = SCORE.allTerms

  for (const queryToken of queryTokens) {
    let bestTermScore = null

    for (const entry of entries) {
      for (const entryToken of entry.tokens) {
        const score = getTermMatchScore(queryToken, entryToken, entry)
        if (score !== null && (bestTermScore === null || score > bestTermScore)) {
          bestTermScore = score
        }
      }
    }

    if (bestTermScore === null) {
      return null
    }

    total += bestTermScore
  }

  return total
}

export function scoreSearchDocument(document, query) {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) {
    return 0
  }

  const entries = document?.entries ?? []
  if (entries.length === 0) {
    return null
  }

  const scores = [
    getIdentifierScore(entries, normalizedQuery.replaceAll(' ', '')),
    getPhraseScore(entries, normalizedQuery),
    getTermsScore(entries, normalizedQuery.split(' '))
  ].filter(score => score !== null)

  return scores.length > 0 ? Math.max(...scores) : null
}

export function rankSearchItems(items = [], {
  getDocument,
  getId = item => item?.id,
  getLabel = item => item?.name,
  query = '',
  sort = SEARCH_SORT_MODES.RELEVANCE
} = {}) {
  const normalizedQuery = normalizeSearchValue(query)
  const results = []

  for (const item of items) {
    const score = scoreSearchDocument(getDocument(item), normalizedQuery)
    if (score !== null) {
      results.push({item, score})
    }
  }

  return results.sort((left, right) => {
    if (normalizedQuery && sort === SEARCH_SORT_MODES.RELEVANCE && left.score !== right.score) {
      return right.score - left.score
    }

    return collator.compare(getLabel(left.item) ?? '', getLabel(right.item) ?? '')
      || collator.compare(getId(left.item) ?? '', getId(right.item) ?? '')
  })
}
