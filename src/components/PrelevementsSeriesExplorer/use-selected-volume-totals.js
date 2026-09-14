import {useEffect, useMemo, useState} from 'react'

import {
  getSelectedVolumeParameters,
  loadSelectedVolumeTotals,
  normalizeVolumeTotalRange,
  sumVolumeValues
} from './selected-volume-totals.js'

const LOADING_TOTAL = {status: 'loading', value: null}
const ERROR_TOTAL = {status: 'error', value: null}

const rangeKey = range => range ? `${range.startDate}/${range.endDate}` : null

/**
 * Full-range sums reuse the loaded API buckets. A refined range is requested
 * only after commitment, so partial buckets are clipped by the API itself.
 */
export function useSelectedVolumeTotals({
  parameters = [],
  selectedParameters = [],
  seriesMap,
  fullRange,
  selectedRange,
  committedRange,
  isLoading = false,
  error,
  getVolumeValuesForRange
}) {
  const volumeParameters = useMemo(
    () => getSelectedVolumeParameters(parameters, selectedParameters),
    [parameters, selectedParameters]
  )
  const parameterIdsKey = JSON.stringify(volumeParameters.map(parameter => parameter.parameterId).sort())
  const fullKey = rangeKey(normalizeVolumeTotalRange(fullRange))
  const selectedKey = rangeKey(normalizeVolumeTotalRange(selectedRange ?? fullRange))
  const committed = normalizeVolumeTotalRange(committedRange ?? selectedRange ?? fullRange)
  const committedKey = rangeKey(committed)
  const startDate = committed?.startDate
  const endDate = committed?.endDate
  const requestKey = `${committedKey}:${parameterIdsKey}`
  const shouldFetch = Boolean(committedKey && committedKey !== fullKey && volumeParameters.length > 0)
  const [response, setResponse] = useState(null)

  useEffect(() => {
    if (!shouldFetch || typeof getVolumeValuesForRange !== 'function') {
      setResponse(null)
      return
    }

    let cancelled = false

    loadSelectedVolumeTotals(
      JSON.parse(parameterIdsKey),
      {startDate, endDate},
      getVolumeValuesForRange
    ).then(totals => {
      if (!cancelled) {
        setResponse({requestKey, loader: getVolumeValuesForRange, totals})
      }
    })

    return () => {
      cancelled = true
    }
  }, [shouldFetch, parameterIdsKey, startDate, endDate, requestKey, getVolumeValuesForRange])

  return volumeParameters.map(parameter => {
    let total

    if (!selectedKey || selectedKey !== committedKey) {
      // Do not show a previous selection's number while the user drags.
      total = LOADING_TOTAL
    } else if (selectedKey === fullKey) {
      total = isLoading ? LOADING_TOTAL : error
        ? ERROR_TOTAL
        : sumVolumeValues(seriesMap?.get(parameter.parameterId)?.values)
    } else if (typeof getVolumeValuesForRange !== 'function') {
      total = ERROR_TOTAL
    } else if (response?.requestKey !== requestKey || response.loader !== getVolumeValuesForRange) {
      total = LOADING_TOTAL
    } else {
      total = response.totals.get(parameter.parameterId) ?? ERROR_TOTAL
    }

    return {...parameter, ...total}
  })
}
