const toTimestamp = value => {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

const getParameterId = parameter => parameter?.id
  ?? parameter?.metricTypeCode
  ?? parameter?.code
  ?? parameter?.name

/**
 * Resolve the date range for the parameters currently displayed.
 * Explicit bounds always win, including when only one bound is provided.
 */
export const resolveSelectedParametersDateRange = ({
  endDate = null,
  parameters = [],
  selectedParameters = [],
  startDate = null
} = {}) => {
  const selectedParameterIds = new Set(selectedParameters.filter(Boolean))
  const collectBounds = onlySelected => {
    let resolvedStart = null
    let resolvedStartTimestamp = null
    let resolvedEnd = null
    let resolvedEndTimestamp = null

    for (const parameter of parameters) {
      if (onlySelected && !selectedParameterIds.has(getParameterId(parameter))) {
        continue
      }

      const minTimestamp = toTimestamp(parameter.minDate)
      if (minTimestamp !== null && (resolvedStartTimestamp === null || minTimestamp < resolvedStartTimestamp)) {
        resolvedStart = parameter.minDate
        resolvedStartTimestamp = minTimestamp
      }

      const maxTimestamp = toTimestamp(parameter.maxDate)
      if (maxTimestamp !== null && (resolvedEndTimestamp === null || maxTimestamp > resolvedEndTimestamp)) {
        resolvedEnd = parameter.maxDate
        resolvedEndTimestamp = maxTimestamp
      }
    }

    return {start: resolvedStart, end: resolvedEnd}
  }

  const selectedBounds = collectBounds(true)
  const fallbackBounds = selectedBounds.start || selectedBounds.end
    ? selectedBounds
    : collectBounds(false)

  const range = {
    start: startDate ?? fallbackBounds.start,
    end: endDate ?? fallbackBounds.end
  }
  const startTimestamp = toTimestamp(range.start)
  const endTimestamp = toTimestamp(range.end)
  if (startTimestamp !== null && endTimestamp !== null && startTimestamp > endTimestamp) {
    // Metadata can describe readings entirely outside the exploitation period.
    // Keep its explicit boundary and only bring the automatic one back inside.
    if (startDate !== null && endDate === null) range.end = range.start
    if (endDate !== null && startDate === null) range.start = range.end
  }
  return range
}
