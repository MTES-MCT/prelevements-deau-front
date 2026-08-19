export const COLLECTEUR_ASSOCIATION_VIEWS = ['ASSOCIATED', 'AVAILABLE']
export const COLLECTEUR_ASSOCIATION_PAGE_SIZES = [25, 50, 100]
export const COLLECTEUR_ASSOCIATION_SORTS = [
  'RELEVANCE',
  'POINT_ASC',
  'POINT_DESC',
  'PRELEVEUR_ASC',
  'PRELEVEUR_DESC'
]

export const EXPLOITATION_STATUS_LABELS = {
  EN_ACTIVITE: 'En activité',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
  NON_RENSEIGNE: 'Non renseigné'
}

const EXPLOITATION_STATUSES = new Set(Object.keys(EXPLOITATION_STATUS_LABELS))
const VIEWS = new Set(COLLECTEUR_ASSOCIATION_VIEWS)
const SORTS = new Set(COLLECTEUR_ASSOCIATION_SORTS)

function readString(searchParams, key) {
  const value = searchParams?.[key]

  if (Array.isArray(value)) {
    return value[0]?.trim() || ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function readStrings(searchParams, key) {
  const value = searchParams?.[key]
  const values = Array.isArray(value) ? value : [value]

  return [...new Set(values
    .flatMap(item => typeof item === 'string' ? item.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean))]
    .slice(0, 50)
}

function readPositiveInteger(searchParams, key, fallback) {
  const parsed = Number.parseInt(readString(searchParams, key), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function getDefaultSort(query) {
  return query ? 'RELEVANCE' : 'POINT_ASC'
}

export function normalizeCollecteurFacetOptions(value, selectedValues = [], labels = {}) {
  const items = Array.isArray(value)
    ? value
    : (Array.isArray(value?.options) ? value.options : [])
  const options = items.map(item => {
    const optionValue = String(item?.value ?? item?.id ?? item?.code ?? '')

    return {
      value: optionValue,
      label: labels[optionValue] ?? item?.label ?? item?.name ?? optionValue,
      count: Number.isFinite(Number(item?.count)) ? Number(item.count) : null
    }
  }).filter(option => option.value)
  const present = new Set(options.map(option => option.value))

  for (const selectedValue of selectedValues) {
    if (!present.has(selectedValue)) {
      options.push({
        value: selectedValue,
        label: labels[selectedValue] ?? selectedValue,
        count: null
      })
    }
  }

  return options
}

export function readCollecteurAssociationOptions(searchParams = {}) {
  const query = readString(searchParams, 'query').slice(0, 200)
  const requestedView = readString(searchParams, 'view').toUpperCase()
  const requestedSort = readString(searchParams, 'sort').toUpperCase()
  const requestedPageSize = readPositiveInteger(searchParams, 'perPage', 25)

  return {
    view: VIEWS.has(requestedView) ? requestedView : 'ASSOCIATED',
    page: readPositiveInteger(searchParams, 'page', 1),
    perPage: COLLECTEUR_ASSOCIATION_PAGE_SIZES.includes(requestedPageSize)
      ? requestedPageSize
      : 25,
    query,
    zoneIds: readStrings(searchParams, 'zoneIds'),
    usageCodes: readStrings(searchParams, 'usageCodes'),
    statuses: readStrings(searchParams, 'statuses')
      .map(value => value.toUpperCase())
      .filter(value => EXPLOITATION_STATUSES.has(value)),
    preleveurId: readString(searchParams, 'preleveurId') || null,
    sort: SORTS.has(requestedSort) && (requestedSort !== 'RELEVANCE' || query)
      ? requestedSort
      : getDefaultSort(query)
  }
}

function appendList(params, key, values) {
  if (Array.isArray(values) && values.length > 0) {
    params.set(key, values.join(','))
  }
}

export function buildCollecteurAssociationQuery(options, {idsOnly = false} = {}) {
  const params = new URLSearchParams({
    view: options.view,
    page: String(options.page),
    perPage: String(options.perPage),
    sort: options.sort
  })

  if (options.query) {
    params.set('query', options.query)
  }

  appendList(params, 'zoneIds', options.zoneIds)
  appendList(params, 'usageCodes', options.usageCodes)
  appendList(params, 'statuses', options.statuses)

  if (options.preleveurId) {
    params.set('preleveurId', options.preleveurId)
  }

  if (idsOnly) {
    params.set('idsOnly', 'true')
  }

  return params.toString()
}

function appendSearchParamValues(params, key, value) {
  const values = Array.isArray(value) ? value : [value]

  for (const item of values) {
    if (item !== undefined && item !== null && item !== '') {
      params.append(key, String(item))
    }
  }
}

function copySearchParams(params, searchParams) {
  if (searchParams && typeof searchParams.entries === 'function') {
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value)
    }

    return
  }

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    appendSearchParamValues(params, key, value)
  }
}

function shouldOmitPathValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return true
  }

  if (Array.isArray(value) && value.length === 0) {
    return true
  }

  return key === 'page' && Number(value) === 1
}

export function buildCollecteurAssociationPathname(pathname, searchParams, values) {
  const params = new URLSearchParams()
  copySearchParams(params, searchParams)

  for (const [key, value] of Object.entries(values)) {
    params.delete(key)

    if (!shouldOmitPathValue(key, value)) {
      appendSearchParamValues(params, key, value)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function isCollecteurAssociationResult(value) {
  return Boolean(
    value
    && Array.isArray(value.data)
    && value.meta
    && VIEWS.has(value.meta.view)
    && Number.isInteger(value.meta.page)
    && Number.isInteger(value.meta.perPage)
    && Number.isInteger(value.meta.total)
    && Number.isInteger(value.meta.totalPages)
    && typeof value.meta.associationVersion === 'string'
  )
}

export function isCandidateSelectable(candidate, view) {
  if (!candidate || candidate.readOnlyReason) {
    return false
  }

  return view === 'AVAILABLE' ? candidate.canAdd === true : candidate.canRemove === true
}

export function getSelectableCandidateIds(candidates, view) {
  return (candidates ?? [])
    .filter(candidate => isCandidateSelectable(candidate, view))
    .map(candidate => candidate.id)
    .filter(Boolean)
}

export function updateSelectedIds(selectedIds, ids, checked) {
  const next = new Set(selectedIds ?? [])

  for (const id of ids) {
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
  }

  return next
}

export function getSelectionPageState(selectedIds, pageIds) {
  const selection = selectedIds instanceof Set ? selectedIds : new Set(selectedIds ?? [])
  const selectedOnPage = pageIds.filter(id => selection.has(id)).length

  return {
    selectedOnPage,
    checked: pageIds.length > 0 && selectedOnPage === pageIds.length,
    indeterminate: selectedOnPage > 0 && selectedOnPage < pageIds.length
  }
}

export function getAssociationMutationPayload(view, selectedIds) {
  const ids = [...new Set(selectedIds ?? [])]

  return view === 'AVAILABLE'
    ? {addExploitationIds: ids, removeExploitationIds: []}
    : {addExploitationIds: [], removeExploitationIds: ids}
}

export function normalizeCollecteurUserIds(values = []) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

export function getCollecteurAssociationChanges(initialIds, currentIds) {
  const expectedCollecteurUserIds = normalizeCollecteurUserIds(initialIds)
  const collecteurUserIds = normalizeCollecteurUserIds(currentIds)
  const unchanged = expectedCollecteurUserIds.length === collecteurUserIds.length
    && expectedCollecteurUserIds.every((id, index) => id === collecteurUserIds[index])

  return unchanged
    ? {}
    : {collecteurUserIds, expectedCollecteurUserIds}
}
