import {deburr} from 'lodash-es'

import {getPointFlowType} from '@/lib/point-flow-types.js'
import {
  getUsageColor,
  getUsageLabel,
  getUsageRootCode
} from '@/lib/water-uses.js'

export const MISSING_USAGE_KEY = '__MISSING_USAGE__'
export const MISSING_WATER_BODY_TYPE = '__MISSING_WATER_BODY_TYPE__'

const EMPTY_SELECTION_VALUE = 'aucun'
const FILTER_QUERY_PARAMETERS = Object.freeze({
  flowTypes: 'type-point',
  query: 'recherche',
  usageKeys: 'usage',
  waterBodyTypes: 'type-milieu'
})

export const WATER_BODY_TYPE_LABELS = Object.freeze({
  SUPERFICIELLE: 'Eau superficielle',
  SOUTERRAIN: 'Eau souterraine',
  TRANSITION: 'Eau de transition',
  [MISSING_WATER_BODY_TYPE]: 'Milieu non renseigné'
})

const MISSING_USAGE_OPTION = Object.freeze({
  value: MISSING_USAGE_KEY,
  label: 'Sans usage renseigné',
  color: '#929292'
})

const normalizeText = value => deburr(String(value ?? '').trim().toLocaleLowerCase('fr-FR'))

const createPointFilterMetadata = point => ({
  flowType: getPointFlowType(point),
  searchText: [point?.name, point?.usageName, point?.codeBSS, point?.id]
    .map(value => normalizeText(value))
    .filter(Boolean)
    .join('\n'),
  usageKeys: getPointUsageRootKeys(point),
  waterBodyType: point?.waterBodyType || MISSING_WATER_BODY_TYPE
})

const compareUsageCodes = (left, right) => {
  if (left === MISSING_USAGE_KEY) {
    return 1
  }

  if (right === MISSING_USAGE_KEY) {
    return -1
  }

  return left.localeCompare(right, 'fr-FR', {numeric: true})
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

export function createPointFilterIndex(points = []) {
  return new Map(points.map(point => [point.id, createPointFilterMetadata(point)]))
}

function getPointFilterMetadata(point, pointFilterIndex) {
  return pointFilterIndex?.get(point.id) ?? createPointFilterMetadata(point)
}

export function pointMatchesSearch(point, query, pointFilterIndex) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return true
  }

  return getPointFilterMetadata(point, pointFilterIndex)
    .searchText.includes(normalizedQuery)
}

export function filterPoints(points = [], filters, pointFilterIndex) {
  const selectedUsageKeys = new Set(filters.usageKeys)
  const selectedFlowTypes = new Set(filters.flowTypes)
  const selectedWaterBodyTypes = new Set(filters.waterBodyTypes)
  const normalizedQuery = normalizeText(filters.query)

  return points.filter(point => {
    const metadata = getPointFilterMetadata(point, pointFilterIndex)
    if (normalizedQuery && !metadata.searchText.includes(normalizedQuery)) {
      return false
    }

    if (!selectedFlowTypes.has(metadata.flowType)) {
      return false
    }

    if (!selectedWaterBodyTypes.has(metadata.waterBodyType)) {
      return false
    }

    return metadata.usageKeys.some(key => selectedUsageKeys.has(key))
  })
}

export function countPointsByUsage(points = [], usageOptions = [], pointFilterIndex) {
  const counts = Object.fromEntries(usageOptions.map(option => [option.value, 0]))

  for (const point of points) {
    const metadata = getPointFilterMetadata(point, pointFilterIndex)
    for (const key of metadata.usageKeys) {
      if (Object.hasOwn(counts, key)) {
        counts[key] += 1
      }
    }
  }

  return counts
}

export function haveSameSelection(left = [], right = []) {
  return left.length === right.length && left.every(value => right.includes(value))
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
  return {
    query: searchParams.get(FILTER_QUERY_PARAMETERS.query) ?? '',
    usageKeys: getSelectionFromSearchParams(
      searchParams,
      FILTER_QUERY_PARAMETERS.usageKeys,
      defaultFilters.usageKeys
    ),
    flowTypes: getSelectionFromSearchParams(
      searchParams,
      FILTER_QUERY_PARAMETERS.flowTypes,
      defaultFilters.flowTypes
    ),
    waterBodyTypes: getSelectionFromSearchParams(
      searchParams,
      FILTER_QUERY_PARAMETERS.waterBodyTypes,
      defaultFilters.waterBodyTypes
    )
  }
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

  setSelectionSearchParams(
    nextSearchParams,
    FILTER_QUERY_PARAMETERS.usageKeys,
    filters.usageKeys,
    defaultFilters.usageKeys
  )
  setSelectionSearchParams(
    nextSearchParams,
    FILTER_QUERY_PARAMETERS.flowTypes,
    filters.flowTypes,
    defaultFilters.flowTypes
  )
  setSelectionSearchParams(
    nextSearchParams,
    FILTER_QUERY_PARAMETERS.waterBodyTypes,
    filters.waterBodyTypes,
    defaultFilters.waterBodyTypes
  )

  return nextSearchParams
}
