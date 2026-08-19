import {getPointFlowType} from '@/lib/point-flow-types.js'
import {
  SEARCH_SORT_MODES,
  createSearchDocument,
  scoreSearchDocument
} from '@/lib/smart-search.js'
import {
  getUsageColor,
  getUsageLabel,
  getUsageRootCode
} from '@/lib/water-uses.js'

export const MISSING_USAGE_KEY = '__MISSING_USAGE__'
export const MISSING_WATER_BODY_TYPE = '__MISSING_WATER_BODY_TYPE__'
export const NO_EXPLOITATION_STATUS = '__WITHOUT_EXPLOITATION__'
export const MISSING_PRELEVEUR_TYPE = '__MISSING_PRELEVEUR_TYPE__'

const EMPTY_SELECTION_VALUE = 'aucun'
const FILTER_QUERY_PARAMETERS = Object.freeze({
  collecteurStatuses: 'collecteur',
  connectorStatuses: 'connecteur',
  exploitationStatuses: 'statut-exploitation',
  flowTypes: 'type-point',
  managementZoneIds: 'zone',
  preleveurTypes: 'type-preleveur',
  query: 'recherche',
  sort: 'tri',
  usageKeys: 'usage',
  waterBodyTypes: 'type-milieu'
})

const FACET_KEYS = Object.freeze([
  'flowTypes',
  'waterBodyTypes',
  'usageKeys',
  'managementZoneIds',
  'exploitationStatuses',
  'collecteurStatuses',
  'connectorStatuses',
  'preleveurTypes'
])

export const WATER_BODY_TYPE_LABELS = Object.freeze({
  SUPERFICIELLE: 'Eau superficielle',
  SOUTERRAIN: 'Eau souterraine',
  TRANSITION: 'Eau de transition',
  [MISSING_WATER_BODY_TYPE]: 'Milieu non renseigné'
})

export const EXPLOITATION_STATUS_LABELS = Object.freeze({
  EN_ACTIVITE: 'En activité',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
  NON_RENSEIGNE: 'Non renseigné',
  [NO_EXPLOITATION_STATUS]: 'Sans exploitation'
})

export const COLLECTEUR_STATUS_LABELS = Object.freeze({
  WITH_COLLECTEUR: 'Avec collecteur',
  WITHOUT_COLLECTEUR: 'Sans collecteur'
})

export const CONNECTOR_STATUS_LABELS = Object.freeze({
  WITH_CONNECTOR: 'Avec connecteur',
  WITHOUT_CONNECTOR: 'Sans connecteur'
})

export const PRELEVEUR_TYPE_LABELS = Object.freeze({
  ICPE: 'ICPE',
  IRRIGANT: 'Irrigant',
  GESTIONNAIRE_AEP: 'Gestionnaire AEP',
  AUTRE: 'Autre',
  [MISSING_PRELEVEUR_TYPE]: 'Type non renseigné'
})

const MISSING_USAGE_OPTION = Object.freeze({
  value: MISSING_USAGE_KEY,
  label: 'Sans usage renseigné',
  color: '#929292'
})

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function compareUsageCodes(left, right) {
  if (left === MISSING_USAGE_KEY) {
    return 1
  }

  if (right === MISSING_USAGE_KEY) {
    return -1
  }

  return left.localeCompare(right, 'fr-FR', {numeric: true})
}

function getManagementZones(point) {
  return Array.isArray(point?.managementZones) ? point.managementZones : []
}

function getSearchAccess(point) {
  return {
    declarants: point?.searchAccess?.declarants === true,
    exploitations: point?.searchAccess?.exploitations === true
  }
}

function getExploitationStatuses(point, canSearchExploitations) {
  if (!canSearchExploitations) {
    return []
  }

  const statuses = uniqueValues(point?.exploitationStatuses)
  return statuses.length > 0 ? statuses : [NO_EXPLOITATION_STATUS]
}

function getPreleveurTypes(point, canSearchDeclarants, hasExploitation) {
  if (!canSearchDeclarants || !hasExploitation) {
    return []
  }

  const types = uniqueValues(point?.preleveurTypes)
  return types.length > 0 ? types : [MISSING_PRELEVEUR_TYPE]
}

function getPointSearchDocument(point, searchAccess) {
  const usages = point?.usages ?? []
  const managementZones = getManagementZones(point)
  const declarantFields = searchAccess.declarants
    ? [
      {value: point?.preleveurLabels, weight: 5},
      {value: point?.preleveurSirets, weight: 9, identifier: true}
    ]
    : []

  return createSearchDocument([
    {value: point?.id, weight: 10, identifier: true},
    {value: point?.codeBSS, weight: 10, identifier: true},
    {value: point?.codeBNPE, weight: 10, identifier: true},
    {value: point?.searchIdentifiers, weight: 9, identifier: true},
    {value: point?.name, weight: 8},
    {value: point?.usageName, weight: 7},
    {value: point?.searchAliases, weight: 6},
    {value: point?.communeName, weight: 5},
    {value: usages.map(usage => usage?.label), weight: 4},
    {value: usages.map(usage => usage?.code), weight: 4, identifier: true},
    {value: managementZones.map(zone => zone?.name), weight: 3},
    {value: managementZones.map(zone => zone?.code), weight: 3, identifier: true},
    ...declarantFields
  ])
}

function createPointFilterMetadata(point) {
  const searchAccess = getSearchAccess(point)
  const rawExploitationStatuses = uniqueValues(point?.exploitationStatuses)
  const hasExploitation = rawExploitationStatuses.length > 0
  const collecteurStatus = searchAccess.exploitations && point?.collecteurStatus
    ? [point.collecteurStatus]
    : []
  const connectorStatus = searchAccess.exploitations && point?.connectorStatus
    ? [point.connectorStatus]
    : []

  return {
    facets: {
      collecteurStatuses: collecteurStatus,
      connectorStatuses: connectorStatus,
      exploitationStatuses: getExploitationStatuses(point, searchAccess.exploitations),
      flowTypes: [getPointFlowType(point)],
      managementZoneIds: uniqueValues(getManagementZones(point).map(zone => zone?.id)),
      preleveurTypes: getPreleveurTypes(point, searchAccess.declarants, hasExploitation),
      usageKeys: getPointUsageRootKeys(point),
      waterBodyTypes: [point?.waterBodyType || MISSING_WATER_BODY_TYPE]
    },
    searchAccess,
    searchDocument: getPointSearchDocument(point, searchAccess)
  }
}

export function getPointUsageRootKeys(point) {
  const keys = new Set(
    (point?.usages ?? [])
      .map(usage => getUsageRootCode(usage))
      .filter(Boolean)
  )

  return keys.size > 0 ? [...keys] : [MISSING_USAGE_KEY]
}

export function getUsageOptionsForPoints(points = []) {
  const optionsByKey = new Map()
  let hasPointWithoutUsage = false

  for (const point of points) {
    const rootKeys = getPointUsageRootKeys(point)
    if (rootKeys.includes(MISSING_USAGE_KEY)) {
      hasPointWithoutUsage = true
      continue
    }

    for (const rootKey of rootKeys) {
      if (!optionsByKey.has(rootKey)) {
        optionsByKey.set(rootKey, {
          value: rootKey,
          label: getUsageLabel(rootKey) || rootKey,
          color: getUsageColor(rootKey)
        })
      }
    }
  }

  if (hasPointWithoutUsage) {
    optionsByKey.set(MISSING_USAGE_KEY, MISSING_USAGE_OPTION)
  }

  return [...optionsByKey.values()]
    .sort((left, right) => compareUsageCodes(left.value, right.value))
}

export function getWaterBodyTypeOptionsForPoints(points = []) {
  const values = new Set()

  for (const point of points) {
    values.add(point.waterBodyType || MISSING_WATER_BODY_TYPE)
  }

  return [...values]
    .sort((left, right) => {
      if (left === MISSING_WATER_BODY_TYPE) {
        return 1
      }

      if (right === MISSING_WATER_BODY_TYPE) {
        return -1
      }

      return (WATER_BODY_TYPE_LABELS[left] ?? left)
        .localeCompare(WATER_BODY_TYPE_LABELS[right] ?? right, 'fr-FR')
    })
    .map(value => ({
      value,
      label: WATER_BODY_TYPE_LABELS[value] ?? value
    }))
}

function getOrderedOptions(values, labels) {
  return Object.entries(labels)
    .filter(([value]) => values.has(value))
    .map(([value, label]) => ({value, label}))
}

function getManagementZoneOptions(points) {
  const zonesById = new Map()

  for (const point of points) {
    for (const zone of getManagementZones(point)) {
      if (zone?.id) {
        const zoneLabel = zone.name || zone.code || zone.id
        zonesById.set(zone.id, {
          value: zone.id,
          label: zone.code && zone.code !== zoneLabel
            ? `${zoneLabel} (${zone.code})`
            : zoneLabel,
          code: zone.code || null
        })
      }
    }
  }

  return [...zonesById.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'fr-FR', {numeric: true, sensitivity: 'base'}))
}

export function getPointFilterOptions(points = [], pointFilterIndex) {
  const index = pointFilterIndex ?? createPointFilterIndex(points)
  const values = index.facetValues

  return {
    collecteurStatusOptions: getOrderedOptions(values.collecteurStatuses, COLLECTEUR_STATUS_LABELS),
    connectorStatusOptions: getOrderedOptions(values.connectorStatuses, CONNECTOR_STATUS_LABELS),
    exploitationStatusOptions: getOrderedOptions(values.exploitationStatuses, EXPLOITATION_STATUS_LABELS),
    managementZoneOptions: getManagementZoneOptions(points),
    preleveurTypeOptions: getOrderedOptions(values.preleveurTypes, PRELEVEUR_TYPE_LABELS),
    usageOptions: getUsageOptionsForPoints(points),
    waterBodyTypeOptions: getWaterBodyTypeOptionsForPoints(points)
  }
}

export function getDefaultPointFilters(options = {}) {
  return {
    collecteurStatuses: (options.collecteurStatusOptions ?? []).map(option => option.value),
    connectorStatuses: (options.connectorStatusOptions ?? []).map(option => option.value),
    exploitationStatuses: (options.exploitationStatusOptions ?? []).map(option => option.value),
    flowTypes: options.flowTypes ?? [],
    managementZoneIds: (options.managementZoneOptions ?? []).map(option => option.value),
    preleveurTypes: (options.preleveurTypeOptions ?? []).map(option => option.value),
    query: '',
    sort: SEARCH_SORT_MODES.RELEVANCE,
    usageKeys: (options.usageOptions ?? []).map(option => option.value),
    waterBodyTypes: (options.waterBodyTypeOptions ?? []).map(option => option.value)
  }
}

export function createPointFilterIndex(points = []) {
  const index = new Map(points.map(point => [point.id, createPointFilterMetadata(point)]))
  const facetValues = Object.fromEntries(FACET_KEYS.map(key => [key, new Set()]))

  for (const metadata of index.values()) {
    for (const key of FACET_KEYS) {
      for (const value of metadata.facets[key]) {
        facetValues[key].add(value)
      }
    }
  }

  index.facetValues = facetValues
  return index
}

export function createPointFilterModel(points = [], {flowTypes = []} = {}) {
  const index = createPointFilterIndex(points)
  const options = getPointFilterOptions(points, index)

  return {
    index,
    options,
    defaultFilters: getDefaultPointFilters({...options, flowTypes})
  }
}

function getPointFilterMetadata(point, pointFilterIndex) {
  return pointFilterIndex?.get(point.id) ?? createPointFilterMetadata(point)
}

export function pointMatchesSearch(point, query, pointFilterIndex) {
  const metadata = getPointFilterMetadata(point, pointFilterIndex)
  return scoreSearchDocument(metadata.searchDocument, query) !== null
}

export function haveSameSelection(left = [], right = []) {
  return left.length === right.length && left.every(value => right.includes(value))
}

function matchesFacet(metadata, filters, pointFilterIndex, key) {
  const selectedValues = filters[key]
  if (!Array.isArray(selectedValues)) {
    return true
  }

  const allValues = [...(pointFilterIndex?.facetValues?.[key] ?? [])]
  if (haveSameSelection(selectedValues, allValues)) {
    return true
  }

  return metadata.facets[key].some(value => selectedValues.includes(value))
}

function matchesFilters(metadata, filters, pointFilterIndex, excludedFacet) {
  return FACET_KEYS.every(key => key === excludedFacet
    || matchesFacet(metadata, filters, pointFilterIndex, key))
}

export function filterPointsWithScores(points = [], filters, pointFilterIndex) {
  const index = pointFilterIndex ?? createPointFilterIndex(points)
  const scores = new Map()
  const matchingPoints = []

  for (const point of points) {
    const metadata = getPointFilterMetadata(point, index)
    const score = scoreSearchDocument(metadata.searchDocument, filters.query)

    if (score !== null) {
      scores.set(point.id, score)
    }

    if (score !== null && matchesFilters(metadata, filters, index)) {
      matchingPoints.push(point)
    }
  }

  return {points: matchingPoints, scores}
}

export function filterPoints(points = [], filters, pointFilterIndex) {
  return filterPointsWithScores(points, filters, pointFilterIndex).points
}

export function getPointFacetCounts(points = [], filters, pointFilterIndex, searchScores) {
  const index = pointFilterIndex ?? createPointFilterIndex(points)
  const counts = Object.fromEntries(FACET_KEYS.map(key => [key, Object.fromEntries(
    [...(index.facetValues[key] ?? [])].map(value => [value, 0])
  )]))

  for (const point of points) {
    const metadata = getPointFilterMetadata(point, index)
    const matchesSearch = searchScores instanceof Map
      ? searchScores.has(point.id)
      : scoreSearchDocument(metadata.searchDocument, filters.query) !== null

    if (!matchesSearch) {
      continue
    }

    for (const key of FACET_KEYS) {
      if (!matchesFilters(metadata, filters, index, key)) {
        continue
      }

      for (const value of metadata.facets[key]) {
        counts[key][value] = (counts[key][value] ?? 0) + 1
      }
    }
  }

  return counts
}

export function countPointsByUsage(points = [], usageOptions = [], pointFilterIndex) {
  const counts = Object.fromEntries(usageOptions.map(option => [option.value, 0]))

  for (const point of points) {
    const metadata = getPointFilterMetadata(point, pointFilterIndex)
    for (const key of metadata.facets.usageKeys) {
      if (Object.hasOwn(counts, key)) {
        counts[key] += 1
      }
    }
  }

  return counts
}

function getSelectionFromSearchParams(searchParams, parameter, defaultValues) {
  const values = searchParams.getAll(parameter)
  if (values.length === 0) {
    return defaultValues
  }

  const selectedValues = defaultValues.filter(value => values.includes(value))
  if (selectedValues.length > 0) {
    return selectedValues
  }

  return values.includes(EMPTY_SELECTION_VALUE) ? [] : defaultValues
}

export function getPointFiltersFromSearchParams(searchParams, defaultFilters) {
  const filters = {
    query: searchParams.get(FILTER_QUERY_PARAMETERS.query) ?? '',
    sort: searchParams.get(FILTER_QUERY_PARAMETERS.sort) === 'nom'
      ? SEARCH_SORT_MODES.NAME
      : SEARCH_SORT_MODES.RELEVANCE
  }

  for (const key of FACET_KEYS) {
    filters[key] = getSelectionFromSearchParams(
      searchParams,
      FILTER_QUERY_PARAMETERS[key],
      defaultFilters[key]
    )
  }

  return filters
}

function setSelectionSearchParams(searchParams, parameter, values, defaultValues) {
  searchParams.delete(parameter)

  if (haveSameSelection(values, defaultValues)) {
    return
  }

  if (values.length === 0) {
    searchParams.append(parameter, EMPTY_SELECTION_VALUE)
    return
  }

  for (const value of defaultValues) {
    if (values.includes(value)) {
      searchParams.append(parameter, value)
    }
  }
}

export function getSearchParamsWithPointFilters(searchParams, filters, defaultFilters) {
  const nextSearchParams = new URLSearchParams(searchParams)
  const normalizedQuery = filters.query.trim()

  if (normalizedQuery) {
    nextSearchParams.set(FILTER_QUERY_PARAMETERS.query, normalizedQuery)
  } else {
    nextSearchParams.delete(FILTER_QUERY_PARAMETERS.query)
  }

  if (normalizedQuery && filters.sort === SEARCH_SORT_MODES.NAME) {
    nextSearchParams.set(FILTER_QUERY_PARAMETERS.sort, 'nom')
  } else {
    nextSearchParams.delete(FILTER_QUERY_PARAMETERS.sort)
  }

  for (const key of FACET_KEYS) {
    setSelectionSearchParams(
      nextSearchParams,
      FILTER_QUERY_PARAMETERS[key],
      filters[key],
      defaultFilters[key]
    )
  }

  return nextSearchParams
}
