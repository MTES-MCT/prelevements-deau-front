const VOLUME_TOTAL_LABELS = {
  PRELEVEMENT: 'Total prélevé',
  REJET: 'Total rejeté'
}

function formatLocalDay(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Parse date-only bounds locally: new Date('YYYY-MM-DD') uses UTC.
  const dateOnly = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : value instanceof Date ? value : new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return null
  }

  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return dateOnly && day !== value ? null : day
}

/** Inclusive local-day bounds, independent of the chart's rendering buckets. */
export function normalizeVolumeTotalRange(range) {
  const startDate = formatLocalDay(range?.start)
  const endDate = formatLocalDay(range?.end)

  if (!startDate || !endDate || startDate > endDate) {
    return null
  }

  return {startDate, endDate}
}

export function getSelectedVolumeParameters(parameters, selectedParameters) {
  const selected = new Set(selectedParameters)
  const seen = new Set()

  return parameters.filter(parameter => {
    if (!selected.has(parameter.value)
      || seen.has(parameter.value)
      || parameter.metricTypeCode !== 'volume'
      || !Object.hasOwn(VOLUME_TOTAL_LABELS, parameter.flowType)) {
      return false
    }

    seen.add(parameter.value)
    return true
  }).map(parameter => ({
    parameterId: parameter.value,
    label: VOLUME_TOTAL_LABELS[parameter.flowType],
    color: parameter.color
  }))
}

/** Sum API volume buckets, never synthetic chart endpoints or rounded labels. */
export function sumVolumeValues(values) {
  if (!Array.isArray(values)) {
    return {status: 'error', value: null}
  }

  let total = 0
  let count = 0

  for (const entry of values) {
    if (Number.isFinite(entry?.value)) {
      total += entry.value
      count++
    }
  }

  if (count === 0) {
    return {status: 'empty', value: null}
  }

  return Number.isFinite(total)
    ? {status: 'ready', value: total}
    : {status: 'error', value: null}
}

/** A failed flow does not hide the independently available total of another. */
export async function loadSelectedVolumeTotals(parameterIds, range, getVolumeValuesForRange) {
  const entries = await Promise.all(parameterIds.map(async parameterId => {
    try {
      const values = await getVolumeValuesForRange(parameterId, range)
      return [parameterId, sumVolumeValues(values)]
    } catch {
      return [parameterId, {status: 'error', value: null}]
    }
  }))

  return new Map(entries)
}
