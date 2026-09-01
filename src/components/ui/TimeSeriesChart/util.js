import {
  addCalendarIncrement,
  isCalendarBasedUnit,
  parseFrequency
} from '@/utils/frequency-parsing.js'
import {getFrequencyOrder} from '@/utils/frequency.js'

export const AXIS_LEFT_ID = 'y-left'
export const AXIS_RIGHT_ID = 'y-right'
export const X_AXIS_ID = 'time'

export const SEGMENT_ABOVE = 'above'
export const SEGMENT_BELOW = 'below'
export const SEGMENT_DEFAULT = 'default'

export const MAX_POINTS_BEFORE_DECIMATION = 2000
export const DECIMATION_TARGET = 800

export const toTimestamp = value => {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'number') {
    return value
  }

  throw new TypeError('TimeSeriesChart: `x` value must be a Date or a number (timestamp).')
}

export const toDate = value => new Date(value)

export const getNumberFormatter = locale => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 2
})

/**
 * Returns a number formatter with specific precision (decimal places).
 * @param {string} locale - Locale string
 * @param {number} precision - Number of decimal places (default: 0 for integers)
 * @returns {Intl.NumberFormat}
 */
export const getNumberFormatterWithPrecision = (locale, precision = 0) => new Intl.NumberFormat(locale, {
  minimumFractionDigits: precision,
  maximumFractionDigits: precision
})

export const getDateFormatter = locale => new Intl.DateTimeFormat(locale, {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

export const collectAxisTooltipRows = ({
  series,
  dataIndex,
  getPointMeta,
  getSegmentOrigin,
  translations
}) => {
  const rows = new Map()

  for (const item of series) {
    const baseId = item.originalId ?? item.id
    if (rows.has(baseId)) {
      continue
    }

    const origin = getSegmentOrigin(baseId, dataIndex)
    if (origin?.displayBoundary && !origin.tooltipDate) {
      continue
    }

    const formattedValue = item.valueFormatter?.(item.data?.[dataIndex] ?? null, {dataIndex})
    if (formattedValue === null || formattedValue === undefined) {
      continue
    }

    const meta = origin?.tooltipMeta ?? getPointMeta(baseId, dataIndex)

    rows.set(baseId, {
      id: baseId,
      label: item.originalLabel ?? item.label,
      value: formattedValue,
      color: item.getColor?.(dataIndex) ?? item.color,
      nature: meta?.comment ?? null,
      natureLabel: meta?.natureLabel ?? null,
      detail: meta?.detail ?? null,
      alert: meta?.alert ?? null,
      syntheticLabel: origin?.synthetic && !origin?.displayBoundary
        ? translations.interpolatedPoint
        : null,
      tooltipDate: origin?.tooltipDate ?? null
    })
  }

  return [...rows.values()]
}

export const getSharedTooltipNature = rows => {
  const natures = [...new Set(rows.map(row => row.nature).filter(Boolean))]
  return natures.length === 1 && rows.every(row => row.nature === natures[0])
    ? natures[0]
    : null
}

const getRealTimelineIndices = (xAxisDates, pointBySeries) => {
  const realIndices = []
  for (const [index] of xAxisDates.entries()) {
    const hasRealValue = [...pointBySeries.values()].some(points => {
      const point = points?.[index]
      return point
        && !point.synthetic
        && !point.displayBoundary
        && typeof point.y === 'number'
        && Number.isFinite(point.y)
    })

    if (hasRealValue) {
      realIndices.push(index)
    }
  }

  return realIndices
}

const getCalendarSpanInMonths = (start, end) => (
  ((end.getFullYear() - start.getFullYear()) * 12)
  + (end.getMonth() - start.getMonth())
  + ((end.getDate() - start.getDate()) / 31)
)

const getMaximumTimelineTickCount = (availableWidth, minimumSpacing = 48) => {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
    return 2
  }

  return Math.max(2, Math.floor(availableWidth / minimumSpacing))
}

const toValidTimelineDate = value => {
  if (value === null || value === undefined) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS_PER_YEAR = 12
const REGULAR_MONTH_TICK_STEPS = [3, 6, 12, 24]
const REGULAR_MONTH_TICK_MINIMUM_SPACING = 80

/**
 * Project a real date onto a calendar axis where every month occupies one
 * unit. Dates remain continuous inside their month through a [0, 1[ fraction.
 */
export const projectDateToCalendarCoordinate = value => {
  const date = toValidTimelineDate(value)
  if (!date) {
    return Number.NaN
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  const monthDuration = nextMonthStart - monthStart
  const monthFraction = monthDuration > 0 ? (date - monthStart) / monthDuration : 0

  return (date.getFullYear() * MONTHS_PER_YEAR) + date.getMonth() + monthFraction
}

export const calendarCoordinateToDate = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const absoluteMonth = Math.floor(value)
  const year = Math.floor(absoluteMonth / MONTHS_PER_YEAR)
  const month = absoluteMonth - (year * MONTHS_PER_YEAR)
  const monthStart = new Date(year, month, 1)
  const nextMonthStart = new Date(year, month + 1, 1)
  const monthFraction = value - absoluteMonth

  return new Date(monthStart.getTime() + (monthFraction * (nextMonthStart - monthStart)))
}

export const getTimelineAxisValue = (value, axisMode) => (
  axisMode === 'calendar'
    ? projectDateToCalendarCoordinate(value)
    : toValidTimelineDate(value)
)

const resolveTimelineDomain = (xAxisDates, timelineRange = null) => {
  const dates = xAxisDates
    .map(value => toValidTimelineDate(value))
    .filter(Boolean)
    .sort((first, second) => first - second)
  if (dates.length === 0) {
    return null
  }

  const requestedStart = toValidTimelineDate(timelineRange?.start)
  const requestedEnd = toValidTimelineDate(timelineRange?.end)
  const start = requestedStart ?? dates[0]
  // The selected range end is an inclusive calendar day. Stop at its final
  // millisecond so a partial weekly/monthly bucket cannot extend past the
  // slider while the last daily bucket still remains fully visible.
  const end = requestedEnd
    ? new Date(
      requestedEnd.getFullYear(),
      requestedEnd.getMonth(),
      requestedEnd.getDate() + 1,
      0, 0, 0, -1
    )
    : [...dates].pop()

  return start <= end
    ? {start, end}
    : {start: end, end: start}
}

const getCalendarBucketStart = (date, granularity) => {
  if (granularity === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  if (granularity === 'quarter') {
    return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
  }

  return new Date(date.getFullYear(), 0, 1)
}

const addCalendarBucket = (date, granularity) => {
  if (granularity === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1)
  }

  if (granularity === 'quarter') {
    return new Date(date.getFullYear(), date.getMonth() + 3, 1)
  }

  return new Date(date.getFullYear() + 1, 0, 1)
}

/**
 * Generate calendar boundaries without relying on observed points. The first
 * visible instant is retained so a partial first month still receives a label.
 */
const buildCalendarCandidates = (start, end, granularity) => {
  const candidates = [new Date(start)]
  const bucketStart = getCalendarBucketStart(start, granularity)
  let cursor = addCalendarBucket(bucketStart, granularity)

  while (cursor <= end) {
    candidates.push(cursor)
    cursor = addCalendarBucket(cursor, granularity)
  }

  return candidates
}

const getRegularMonthTickStep = (spanMonths, availableWidth) => {
  const maximumTickCount = Math.max(
    4,
    getMaximumTimelineTickCount(availableWidth, REGULAR_MONTH_TICK_MINIMUM_SPACING)
  )
  const minimumStep = Math.ceil(spanMonths / Math.max(1, maximumTickCount - 1))

  return REGULAR_MONTH_TICK_STEPS.find(step => step >= minimumStep)
    ?? REGULAR_MONTH_TICK_STEPS.at(-1)
}

/**
 * Build predictable month ticks instead of selecting arbitrary months after
 * the fact. Anchoring every tick on the visible start keeps the spacing
 * strictly regular even when the selected period starts mid-month.
 */
const buildRegularMonthCandidates = (start, end, stepMonths) => {
  const startCoordinate = projectDateToCalendarCoordinate(start)
  const endCoordinate = projectDateToCalendarCoordinate(end)
  const candidates = []

  for (let coordinate = startCoordinate; coordinate <= endCoordinate; coordinate += stepMonths) {
    const candidate = calendarCoordinateToDate(coordinate)
    if (candidate) {
      candidates.push(candidate)
    }
  }

  return candidates
}

const decimateCalendarCandidates = (
  candidates,
  maximumTickCount,
  {preserveYearTransitions = true} = {}
) => {
  if (candidates.length <= maximumTickCount) {
    return candidates
  }

  const mandatoryCandidateIndices = new Set([0, candidates.length - 1])
  if (preserveYearTransitions) {
    for (let index = 1; index < candidates.length; index++) {
      if (candidates[index].getFullYear() !== candidates[index - 1].getFullYear()) {
        mandatoryCandidateIndices.add(index)
      }
    }
  }

  const targetCount = Math.max(maximumTickCount, mandatoryCandidateIndices.size)
  while (mandatoryCandidateIndices.size < targetCount) {
    let bestCandidateIndex = null
    let bestDistance = -1

    for (const [candidateIndex] of candidates.entries()) {
      if (mandatoryCandidateIndices.has(candidateIndex)) {
        continue
      }

      const distance = Math.min(
        ...[...mandatoryCandidateIndices].map(selectedIndex => Math.abs(selectedIndex - candidateIndex))
      )
      if (distance > bestDistance) {
        bestCandidateIndex = candidateIndex
        bestDistance = distance
      }
    }

    if (bestCandidateIndex === null) {
      break
    }

    mandatoryCandidateIndices.add(bestCandidateIndex)
  }

  return [...mandatoryCandidateIndices]
    .sort((first, second) => first - second)
    .map(index => candidates[index])
}

const buildCalendarLabels = (candidates, formatLabel) => {
  const labels = new Map()
  let previousYear = null

  for (const [candidateIndex, date] of candidates.entries()) {
    const year = date.getFullYear()
    labels.set(date.getTime(), formatLabel(date, {
      showYear: candidateIndex === 0 || year !== previousYear
    }))
    previousYear = year
  }

  return labels
}

const selectEvenlySpacedDates = (dates, maximumTickCount) => {
  if (dates.length <= maximumTickCount) {
    return dates
  }

  const lastIndex = dates.length - 1
  const selectedIndices = new Set([0, lastIndex])
  for (let index = 1; index < maximumTickCount - 1; index++) {
    selectedIndices.add(Math.round((index * lastIndex) / (maximumTickCount - 1)))
  }

  return [...selectedIndices]
    .sort((first, second) => first - second)
    .map(index => dates[index])
}

const deduplicateFormattedTicks = (dates, formatter) => {
  const values = []
  const labels = new Map()
  let previousLabel = null

  for (const date of dates) {
    const label = formatter(date)
    if (!label || label === previousLabel) {
      continue
    }

    values.push(date)
    labels.set(date.getTime(), label)
    previousLabel = label
  }

  return {values, labels}
}

/**
 * Build calendar-aware ticks independently from the data aggregation frequency.
 * Short ranges retain date labels, annual ranges use months, then longer ranges
 * progressively use quarters and years. Consumers can keep monthly labels on
 * medium-long ranges when quarter abbreviations are not meaningful to users.
 */
export const buildTimelineTicks = ({
  xAxisDates,
  pointBySeries = null,
  availableWidth,
  locale,
  frequency,
  timelineRange = null,
  allowQuarterlyTicks = true
}) => {
  if (!Array.isArray(xAxisDates) || xAxisDates.length === 0) {
    return {
      values: [], labels: new Map(), granularity: 'date', axisMode: 'time', domain: null
    }
  }

  const domain = resolveTimelineDomain(xAxisDates, timelineRange)
  if (!domain) {
    return {
      values: [], labels: new Map(), granularity: 'date', axisMode: 'time', domain: null
    }
  }

  const {start, end} = domain
  const spanMonths = getCalendarSpanInMonths(start, end)
  const maximumTickCount = getMaximumTimelineTickCount(availableWidth)

  if (spanMonths < 3) {
    const formatter = axisFormatterFactory(locale, xAxisDates, frequency)
    const candidateDates = pointBySeries instanceof Map
      ? getRealTimelineIndices(xAxisDates, pointBySeries).map(index => xAxisDates[index])
      : xAxisDates
    const candidates = candidateDates
      .map(value => toValidTimelineDate(value))
      .filter(date => date && date >= start && date <= end)
      .sort((first, second) => first - second)
    const ticks = deduplicateFormattedTicks(
      selectEvenlySpacedDates(candidates, maximumTickCount),
      formatter
    )
    return {
      ...ticks,
      granularity: 'date',
      axisMode: 'time',
      domain
    }
  }

  if (spanMonths <= 18) {
    const monthFormatter = new Intl.DateTimeFormat(locale, {month: 'short'})
    const candidates = decimateCalendarCandidates(
      buildCalendarCandidates(start, end, 'month'),
      maximumTickCount
    )
    return {
      values: candidates,
      labels: buildCalendarLabels(candidates, (date, {showYear}) => {
        const month = monthFormatter.format(date)
        return showYear ? `${month} ${date.getFullYear()}` : month
      }),
      granularity: 'month',
      axisMode: 'calendar',
      domain
    }
  }

  if (!allowQuarterlyTicks && spanMonths <= 60) {
    const monthFormatter = new Intl.DateTimeFormat(locale, {month: 'short'})
    const stepMonths = getRegularMonthTickStep(spanMonths, availableWidth)
    const candidates = buildRegularMonthCandidates(start, end, stepMonths)
    return {
      values: candidates,
      labels: buildCalendarLabels(candidates, (date, {showYear}) => {
        const month = monthFormatter.format(date)
        return showYear ? `${month} ${date.getFullYear()}` : month
      }),
      granularity: 'month',
      axisMode: 'calendar',
      domain
    }
  }

  if (spanMonths <= 60) {
    const candidates = decimateCalendarCandidates(
      buildCalendarCandidates(start, end, 'quarter'),
      maximumTickCount,
      {preserveYearTransitions: false}
    )
    const quarterPrefix = locale?.startsWith('fr') ? 'T' : 'Q'
    return {
      values: candidates,
      labels: buildCalendarLabels(candidates, (date, {showYear}) => {
        const quarter = `${quarterPrefix}${Math.floor(date.getMonth() / 3) + 1}`
        return showYear ? `${quarter} ${date.getFullYear()}` : quarter
      }),
      granularity: 'quarter',
      axisMode: 'calendar',
      domain
    }
  }

  const candidates = decimateCalendarCandidates(
    buildCalendarCandidates(start, end, 'year'),
    maximumTickCount,
    {preserveYearTransitions: false}
  )
  return {
    values: candidates,
    labels: new Map(candidates.map(date => [date.getTime(), String(date.getFullYear())])),
    granularity: 'year',
    axisMode: 'calendar',
    domain
  }
}

/**
 * Build the MUI X axis configuration. Short ranges use real elapsed time;
 * calendar views use equal-width months while keeping positions continuous
 * inside each month.
 */
export const buildTimelineXAxis = ({xAxisDates, timelineTicks, fallbackFormatter}) => {
  const {axisMode} = timelineTicks
  const data = axisMode === 'calendar'
    ? xAxisDates.map(date => getTimelineAxisValue(date, axisMode))
    : xAxisDates
  const tickInterval = axisMode === 'calendar'
    ? timelineTicks.values.map(date => getTimelineAxisValue(date, axisMode))
    : timelineTicks.values
  const tickLabels = new Map(timelineTicks.values.map((date, index) => [
    axisMode === 'calendar' ? tickInterval[index] : date.getTime(),
    timelineTicks.labels.get(date.getTime())
  ]))
  const domain = timelineTicks.domain && {
    start: getTimelineAxisValue(timelineTicks.domain.start, axisMode),
    end: getTimelineAxisValue(timelineTicks.domain.end, axisMode)
  }

  return {
    id: X_AXIS_ID,
    scaleType: axisMode === 'calendar' ? 'linear' : 'time',
    data,
    domainLimit: 'strict',
    ...(domain && {min: domain.start, max: domain.end}),
    tickInterval,
    valueFormatter(value) {
      const date = axisMode === 'calendar'
        ? calendarCoordinateToDate(value)
        : toValidTimelineDate(value)
      const tickKey = axisMode === 'calendar' ? value : date?.getTime()
      return tickLabels.get(tickKey) ?? (date ? fallbackFormatter(date) : '')
    },
    tickLabelStyle: {fontSize: 12}
  }
}

/**
 * Format a quarter label based on locale
 * @param {Date} date - Date to extract quarter from
 * @param {string} locale - Locale string (e.g., 'fr-FR', 'en-US')
 * @returns {string} Formatted quarter (e.g., 'T1 2025' for French, 'Q1 2025' for English)
 */
const formatQuarter = (date, locale) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  const year = date.getFullYear()
  const prefix = locale.startsWith('fr') ? 'T' : 'Q'
  return `${prefix}${quarter} ${year}`
}

/**
 * Get appropriate date formatter based on aggregation frequency
 * Prioritizes frequency over range-based detection for consistent formatting
 *
 * @param {string} frequency - Aggregation frequency (e.g., '1 day', '1 month', '1 year')
 * @param {string} locale - Locale string (e.g., 'fr-FR', 'en-US')
 * @returns {Object} Formatter object with a format() method
 */
export const getDateFormatForFrequency = (frequency, locale) => {
  if (!frequency) {
    throw new Error('TimeSeriesChart: frequency is required for date formatting')
  }

  const parsed = parseFrequency(frequency)
  if (!parsed) {
    throw new Error(`TimeSeriesChart: invalid frequency format: ${frequency}`)
  }

  const {unit} = parsed

  // Quarter requires custom formatting
  if (unit === 'quarter') {
    return {
      format: date => formatQuarter(date instanceof Date ? date : new Date(date), locale)
    }
  }

  // Year → show year only (yyyy)
  if (unit === 'year') {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric'
    })
  }

  // Month → show month + year (MMM yyyy)
  if (unit === 'month') {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short'
    })
  }

  // Day, week, or 6-hour intervals → show day and month (dd/MM)
  // 6-hour aggregation is treated as daily aggregation
  if (unit === 'day' || unit === 'week') {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit'
    })
  }

  if (unit === 'hour') {
    const {value} = parsed
    // 6-hour aggregation is treated as daily
    if (value === 6) {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit'
      })
    }
  }

  // Hour, minute, second → show time (HH:mm)
  if (unit === 'hour' || unit === 'minute' || unit === 'second') {
    return new Intl.DateTimeFormat(locale, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fallback to full date/time
  return getDateFormatter(locale)
}

/**
 * Determines appropriate date formatter based on aggregation frequency
 * This replaces the previous range-based approach to ensure consistent formatting
 * that matches the actual data aggregation level
 *
 * @param {string} locale - Locale string (e.g., 'fr-FR', 'en-US')
 * @param {Date[]} dates - Array of dates representing the visible x-axis data points in the chart
 * @param {string} frequency - Aggregation frequency (e.g., '1 day', '1 month', '1 year')
 * @returns {Object} Configured date formatter based on frequency
 */
export const getRangeBasedDateFormatter = (locale, dates, frequency) => {
  if (!frequency) {
    throw new Error('TimeSeriesChart: frequency is required for date formatting')
  }

  if (!dates || dates.length === 0) {
    // Default to frequency-based format if no dates provided
    return getDateFormatForFrequency(frequency, locale)
  }

  // Use frequency-based formatting for consistent behavior
  return getDateFormatForFrequency(frequency, locale)
}

const average = (points, accessor) => {
  if (points.length === 0) {
    return 0
  }

  return points.reduce((sum, point) => sum + accessor(point), 0) / points.length
}

export const largestTriangleThreeBuckets = (points, threshold) => {
  if (points.length <= threshold || threshold <= 2) {
    return points.map(point => point.index)
  }

  const sampled = [points[0].index]
  const bucketSize = (points.length - 2) / (threshold - 2)
  let previous = points[0]

  for (let i = 0; i < threshold - 2; i += 1) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1
    const range = points.slice(rangeStart, Math.min(rangeEnd, points.length))
    const avgX = average(range, point => point.x)
    const avgY = average(range, point => point.y)
    const bucketStart = Math.floor(i * bucketSize) + 1
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1
    const bucket = points.slice(bucketStart, Math.min(bucketEnd, points.length - 1))

    let maxArea = -1
    let candidatePoint = bucket[0]

    for (const candidate of bucket) {
      const area = Math.abs(((previous.x - avgX) * (candidate.y - previous.y)) - ((previous.x - candidate.x) * (avgY - previous.y))) / 2
      if (area > maxArea) {
        maxArea = area
        candidatePoint = candidate
      }
    }

    if (candidatePoint) {
      sampled.push(candidatePoint.index)
      previous = candidatePoint
    }
  }

  sampled.push(points.at(-1).index)
  return [...new Set(sampled)].sort((first, second) => first - second)
}

export const decimatePoints = (dataPoints, threshold) => {
  if (!Array.isArray(dataPoints) || dataPoints.length <= threshold) {
    return {indices: dataPoints.map((_, index) => index), didDecimate: false}
  }

  const keepIndices = new Set()
  const numericPoints = []

  for (const [index, point] of dataPoints.entries()) {
    if (point.y === null || Number.isNaN(point.y)) {
      keepIndices.add(index)
      continue
    }

    numericPoints.push({
      index,
      x: point.x,
      y: point.y,
      preserve: Boolean(point.meta && (point.meta.comment || point.meta.alert))
    })
  }

  if (numericPoints.length <= threshold) {
    return {indices: dataPoints.map((_, index) => index), didDecimate: false}
  }

  for (const point of numericPoints.filter(point => point.preserve)) {
    keepIndices.add(point.index)
  }

  const sampled = largestTriangleThreeBuckets(numericPoints, threshold)
  for (const index of sampled) {
    keepIndices.add(index)
  }

  return {indices: [...keepIndices].sort((first, second) => first - second), didDecimate: true}
}

export const buildThresholdEvaluator = threshold => {
  if (threshold === undefined) {
    return () => null
  }

  if (typeof threshold === 'number') {
    return () => threshold
  }

  if (Array.isArray(threshold)) {
    if (threshold.length === 0) {
      return () => null
    }

    const sorted = threshold
      .map(point => ({x: toTimestamp(point.x), y: point.y}))
      .sort((a, b) => a.x - b.x)

    const cache = new Map(sorted.map(point => [point.x, point.y]))

    return xValue => {
      if (cache.has(xValue)) {
        return cache.get(xValue)
      }

      let lowerIndex = -1
      for (const [index, element] of sorted.entries()) {
        if (element.x <= xValue) {
          lowerIndex = index
        } else {
          break
        }
      }

      if (lowerIndex < 0) {
        return sorted[0].y
      }

      if (lowerIndex >= sorted.length - 1) {
        return sorted.at(-1).y
      }

      const lower = sorted[lowerIndex]
      const upper = sorted[lowerIndex + 1]
      const range = upper.x - lower.x
      if (range === 0) {
        return lower.y
      }

      const ratio = (xValue - lower.x) / range
      return lower.y + (ratio * (upper.y - lower.y))
    }
  }

  throw new TypeError('TimeSeriesChart: invalid threshold format.')
}

export const classifyPoint = (y, threshold) => {
  if (y === null || Number.isNaN(y)) {
    return null
  }

  if (threshold === null || threshold === undefined) {
    return SEGMENT_DEFAULT
  }

  return y > threshold ? SEGMENT_ABOVE : SEGMENT_BELOW
}

/**
 * Process and prepare raw input series data
 * Sorts points, applies decimation, and normalizes data structure
 */
export const processInputSeries = (inputSeries, options = {}) => {
  const {
    enableThresholds = true,
    enableDecimation = true,
    decimationTarget = DECIMATION_TARGET
  } = options
  const axisId = inputSeries.axis === 'right' ? AXIS_RIGHT_ID : AXIS_LEFT_ID
  const thresholdConfig = enableThresholds ? inputSeries.threshold : undefined
  const thresholdEvaluator = enableThresholds ? buildThresholdEvaluator(thresholdConfig) : () => null
  const chartType = inputSeries.type === 'bar' ? 'bar' : 'line'

  const sortedPoints = [...inputSeries.data]
    .map(point => ({
      x: toTimestamp(point.x),
      y: point.y,
      meta: point.meta ?? null,
      tooltipDate: point.tooltipDate ?? null,
      tooltipMeta: point.tooltipMeta ?? null,
      synthetic: Boolean(point.synthetic),
      displayBoundary: Boolean(point.displayBoundary),
      // Preserve showMark property if present (used for segment boundary detection)
      showMark: point.showMark
    }))
    .sort((a, b) => a.x - b.x)

  const decimationResult = enableDecimation
    ? decimatePoints(sortedPoints, decimationTarget)
    : {indices: sortedPoints.map((_, index) => index), didDecimate: false}
  const {indices, didDecimate} = decimationResult
  const filteredPoints = indices.map(index => sortedPoints[index])

  return {
    axisId,
    thresholdEvaluator,
    sortedPoints,
    filteredPoints,
    didDecimate,
    id: inputSeries.id,
    label: inputSeries.label,
    color: inputSeries.color,
    threshold: thresholdConfig,
    chartType,
    precision: inputSeries.precision ?? 0,
    connectNulls: Boolean(inputSeries.connectNulls),
    ...(inputSeries.curve && {curve: inputSeries.curve}),
    ...(inputSeries.area && {area: true}),
    ...(inputSeries.stack && {stack: inputSeries.stack})
  }
}

/**
 * Calculate synthetic threshold crossing points
 * Returns points where series data crosses threshold line
 */
export const computeThresholdCrossings = (filteredPoints, thresholdEvaluator) => {
  const crossings = []

  for (let index = 0; index < filteredPoints.length - 1; index += 1) {
    const current = filteredPoints[index]
    const next = filteredPoints[index + 1]

    if (current.y === null || next.y === null) {
      continue
    }

    const currentThreshold = thresholdEvaluator(current.x)
    const nextThreshold = thresholdEvaluator(next.x)

    if (currentThreshold === null || currentThreshold === undefined
        || nextThreshold === null || nextThreshold === undefined) {
      continue
    }

    const deltaCurrent = current.y - currentThreshold
    const deltaNext = next.y - nextThreshold

    // Check if crossing occurs (sign change between deltas)
    if (deltaCurrent === 0 || deltaNext === 0 || deltaCurrent * deltaNext > 0) {
      continue
    }

    const ratio = deltaCurrent / (deltaCurrent - deltaNext)
    const xCross = current.x + ((next.x - current.x) * ratio)
    const yCross = current.y + ((next.y - current.y) * ratio)

    crossings.push({
      x: xCross,
      y: yCross,
      meta: null,
      synthetic: true
    })
  }

  return crossings
}

/**
 * Resample a series to match a target frequency by duplicating values
 * Respects genuine data gaps (when delta between points > native frequency)
 *
 * @param {Map} pointMap - Original point map with sparse data
 * @param {number[]} targetXValues - Target x-axis values at finer frequency
 * @param {string} nativeFrequency - Native frequency of the series (e.g., '1 day')
 * @param {string} targetFrequency - Target frequency to resample to (e.g., '6 hour')
 * @returns {Map} Resampled point map with duplicated values
 */
export const resampleSeriesData = (pointMap, targetXValues, nativeFrequency, targetFrequency) => {
  // Parse frequencies to milliseconds for comparison
  const nativeMs = parseFrequencyToMs(nativeFrequency)
  const targetMs = parseFrequencyToMs(targetFrequency)

  if (!nativeMs || !targetMs) {
    // Cannot resample without valid frequencies
    return pointMap
  }

  if (nativeMs <= targetMs) {
    // Native frequency is finer or equal - no resampling needed
    return pointMap
  }

  // Sort original points by timestamp
  const originalPoints = [...pointMap.entries()]
    .map(([x, point]) => ({x, ...point}))
    .sort((a, b) => a.x - b.x)

  if (originalPoints.length === 0) {
    return pointMap
  }

  const resampledMap = new Map()

  // Tolerance for considering two points consecutive.
  // We allow up to 1.5x the native frequency to treat points as continuous so that
  // small scheduling jitter/clock drift (e.g. ~50% slower than ideal) does not
  // create artificial gaps, while intervals significantly longer than the expected
  // native spacing are still detected as genuine missing data.
  const gapThreshold = nativeMs * 1.5

  // For each target timestamp, find which original point it belongs to
  for (const targetX of targetXValues) {
    // Find the original point that "owns" this target timestamp
    // A point owns all timestamps from itself until just before the next point
    let ownerPoint = null

    for (let i = 0; i < originalPoints.length; i++) {
      const point = originalPoints[i]
      const nextPoint = originalPoints[i + 1]

      if (targetX < point.x) {
        // Target is before this point - no owner
        break
      }

      if (nextPoint) {
        // Check if target is between this point and next
        /* eslint-disable max-depth */
        if (targetX >= point.x && targetX < nextPoint.x) {
          // Check if there's a gap between this point and next
          const delta = nextPoint.x - point.x
          if (delta <= gapThreshold) {
            // No gap - this point owns the target timestamp
            ownerPoint = point
          }
          /* eslint-enable max-depth */

          break
        }
      } else {
        // This is the last point - it owns everything after it
        // But only within the native frequency threshold
        const delta = targetX - point.x
        if (delta <= nativeMs) {
          ownerPoint = point
        }

        break
      }
    }

    if (ownerPoint) {
      // Duplicate the owner's value to this target timestamp
      resampledMap.set(targetX, {
        x: targetX,
        y: ownerPoint.y,
        meta: ownerPoint.meta,
        synthetic: false, // Not a threshold crossing, just a resampled point
        resampled: true, // Mark as resampled for debugging
        originalX: ownerPoint.x // Keep reference to original timestamp
      })
    }
    // If no owner, leave this timestamp as null (genuine gap)
  }

  return resampledMap
}

/**
 * Detect native frequency from a series' data points
 * @param {Array} dataPoints - Array of {x, y} points
 * @returns {string|null} Detected frequency string (e.g., '1 day') or null
 */
export const detectNativeFrequency = dataPoints => {
  if (dataPoints.length < 2) {
    return null
  }

  // Calculate deltas between consecutive points
  const deltas = []
  for (let i = 1; i < dataPoints.length; i++) {
    const delta = dataPoints[i].x - dataPoints[i - 1].x
    if (delta > 0) {
      deltas.push(delta)
    }
  }

  if (deltas.length === 0) {
    return null
  }

  // Use median delta to be robust against outliers
  deltas.sort((a, b) => a - b)
  const medianDelta = deltas[Math.floor(deltas.length / 2)]

  // Map delta to frequency string
  const MS_PER_MINUTE = 60 * 1000
  const MS_PER_HOUR = 60 * MS_PER_MINUTE
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const MS_PER_WEEK = 7 * MS_PER_DAY
  // Approximate month length using 30 days; calendar-based frequency parsing
  // elsewhere handles actual month boundaries when working with real dates.
  const MS_PER_MONTH = 30 * MS_PER_DAY

  // Find closest match with some tolerance
  const frequencies = [
    {ms: MS_PER_MINUTE, str: '1 minute'},
    {ms: 15 * MS_PER_MINUTE, str: '15 minute'},
    {ms: MS_PER_HOUR, str: '1 hour'},
    {ms: 6 * MS_PER_HOUR, str: '6 hour'},
    {ms: MS_PER_DAY, str: '1 day'},
    {ms: MS_PER_WEEK, str: '1 week'},
    {ms: MS_PER_MONTH, str: '1 month'}
  ]

  let closest = frequencies[0]
  let minDiff = Math.abs(medianDelta - closest.ms)

  for (const freq of frequencies) {
    const diff = Math.abs(medianDelta - freq.ms)
    if (diff < minDiff) {
      minDiff = diff
      closest = freq
    }
  }

  // Only accept if within 20% tolerance. A 20% margin was chosen as a balance
  // between robustness to minor timestamp jitter / irregular sampling and rejecting
  // data that does not consistently match any of the known frequencies. If the
  // closest match is outside this threshold, we return null to indicate that no
  // reliable native frequency could be detected for the provided data.
  if (minDiff / closest.ms < 0.2) {
    return closest.str
  }

  return null
}

/**
 * Build unified point map for a series
 * Combines actual data points with synthetic threshold crossings
 */
export const buildPointMap = (filteredPoints, thresholdCrossings, xValuesSet) => {
  const pointMap = new Map()

  const upsertPoint = (x, data) => {
    const existing = pointMap.get(x)
    if (!existing || existing.synthetic) {
      pointMap.set(x, data)
    }
  }

  for (const point of filteredPoints) {
    upsertPoint(point.x, {...point, synthetic: Boolean(point.synthetic)})
    xValuesSet.add(point.x)
  }

  for (const crossing of thresholdCrossings) {
    upsertPoint(crossing.x, crossing)
    xValuesSet.add(crossing.x)
  }

  return pointMap
}

/**
 * Align series data to unified x-axis and update axis statistics
 */
export const alignSeriesToXAxis = (
  processedSeries,
  xValues,
  xAxisDates,
  {axisStats, visibilityModel = null}
) => {
  const metaBySeries = new Map()
  const pointBySeries = new Map()
  const alignedData = []

  for (const processed of processedSeries) {
    const includeInAxis = visibilityModel?.[processed.id] !== false
    const metas = []
    const pointsWithMeta = []
    const values = []
    const thresholds = []

    for (const [index, xValue] of xValues.entries()) {
      const entry = processed.points.get(xValue) ?? null
      const y = entry ? entry.y : null
      const meta = entry ? entry.meta : null
      const synthetic = Boolean(entry?.synthetic)
      const showMark = entry?.showMark
      const thresholdValue = processed.thresholdEvaluator(xValue)

      // Update axis statistics
      if (includeInAxis && y !== null && !Number.isNaN(y)) {
        const stats = axisStats[processed.axisId]
        stats.min = Math.min(stats.min, y)
        stats.max = Math.max(stats.max, y)
      }

      if (includeInAxis && thresholdValue !== null && thresholdValue !== undefined) {
        const stats = axisStats[processed.axisId]
        stats.min = Math.min(stats.min, thresholdValue)
        stats.max = Math.max(stats.max, thresholdValue)
      }

      metas[index] = meta
      pointsWithMeta[index] = {
        x: xAxisDates[index],
        y,
        meta,
        tooltipDate: entry?.tooltipDate ?? null,
        tooltipMeta: entry?.tooltipMeta ?? null,
        synthetic,
        displayBoundary: Boolean(entry?.displayBoundary),
        showMark,
        axisId: processed.axisId
      }
      values[index] = y
      thresholds[index] = thresholdValue
    }

    metaBySeries.set(processed.id, metas)
    pointBySeries.set(processed.id, pointsWithMeta)

    alignedData.push({
      ...processed,
      metas,
      pointsWithMeta,
      values,
      thresholds
    })
  }

  return {metaBySeries, pointBySeries, alignedData}
}

/**
 * Build threshold series for dynamic (time-varying) thresholds
 */
export const buildDynamicThresholdSeries = (alignedData, theme) => {
  const dynamicThresholdSeries = []

  for (const data of alignedData) {
    if (Array.isArray(data.thresholdConfig)) {
      dynamicThresholdSeries.push({
        id: `threshold-${data.id}`,
        originalId: data.id,
        originalLabel: data.label,
        color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.main,
        data: data.thresholds.map(value => (value === null || value === undefined ? null : value)),
        label: undefined,
        xAxisId: X_AXIS_ID,
        yAxisId: data.axisId,
        showMark: false,
        connectNulls: false,
        valueFormatter: () => null
      })
    }
  }

  return dynamicThresholdSeries
}

/**
 * Split series data into segments based on threshold classification
 */
export const buildSegments = (alignedData, xValues, options) => {
  const {locale, exposeAllMarks, theme} = options
  const segmentSeries = []
  const segmentToOriginal = new Map()

  for (const data of alignedData) {
    const {values, thresholds, pointsWithMeta} = data
    // Create per-series formatter with appropriate precision
    const seriesFormatter = getNumberFormatterWithPrecision(locale, data.precision ?? 0)
    let currentSegment = null
    const segments = []
    let previousSegmentLastIndex = null

    const flushSegment = (nextIndex = null) => {
      if (!currentSegment) {
        return
      }

      const segmentData = Array.from({length: xValues.length}).fill(null)
      // Helper function to include synthetic points in a segment
      const includeSyntheticPoint = (index, pointsWithMeta, values, segmentData) => {
        if (index === null || index === undefined) {
          return
        }

        const point = pointsWithMeta[index]
        if (!point?.synthetic) {
          return
        }

        const value = values[index]
        if (value === null || value === undefined) {
          return
        }

        segmentData[index] = value
      }

      includeSyntheticPoint(previousSegmentLastIndex, pointsWithMeta, values, segmentData)

      // Fill in current segment's points
      for (const index of currentSegment.indices) {
        segmentData[index] = values[index]
      }

      includeSyntheticPoint(nextIndex, pointsWithMeta, values, segmentData)
      const getLastIndexForNextSegment = (nextIndex, pointsWithMeta, currentSegment) => {
        if (nextIndex !== null && pointsWithMeta[nextIndex]?.synthetic) {
          return nextIndex
        }

        if (currentSegment.indices.length > 0) {
          return currentSegment.indices.at(-1)
        }

        return null
      }

      const lastIndexForNextSegment = getLastIndexForNextSegment(nextIndex, pointsWithMeta, currentSegment)

      const segmentId = `${data.id}__segment-${segments.length}`
      const segment = {
        id: segmentId,
        originalId: data.id,
        originalLabel: data.label,
        classification: currentSegment.classification,
        data: segmentData,
        xAxisId: X_AXIS_ID,
        yAxisId: data.axisId,
        color: currentSegment.classification === SEGMENT_ABOVE ? theme.palette.error.main : data.color,
        label: undefined,
        connectNulls: Boolean(data.connectNulls || data.area),
        ...(data.curve && {curve: data.curve}),
        ...(data.area && {area: true}),
        ...(data.stack && {stack: data.stack}),
        showMark({index}) {
          const point = pointsWithMeta[index]
          if (!point || point.synthetic) {
            return false
          }

          // If showMark property is explicitly set (from segment boundary detection), use it
          if (typeof point.showMark === 'boolean') {
            return point.showMark
          }

          // Only show explicit boundary marks or exposeAllMarks.
          return exposeAllMarks
        },
        valueFormatter(value) {
          if (value === null || Number.isNaN(value)) {
            return null
          }

          return seriesFormatter.format(value)
        }
      }
      segments.push(segment)
      segmentToOriginal.set(segmentId, data.id)
      currentSegment = null
      previousSegmentLastIndex = lastIndexForNextSegment
    }

    for (const [index, value] of values.entries()) {
      const classification = classifyPoint(value, thresholds[index])
      if (!classification) {
        flushSegment()
        previousSegmentLastIndex = null
        continue
      }

      if (!currentSegment || currentSegment.classification !== classification) {
        flushSegment(index)
        currentSegment = {
          classification,
          indices: []
        }
      }

      currentSegment.indices.push(index)
    }

    flushSegment()
    segmentSeries.push(...segments)
  }

  return {segmentSeries, segmentToOriginal}
}

/**
 * Build simplified series when thresholds are disabled.
 */
export const buildPlainSeries = (alignedData, options) => {
  const {locale, exposeAllMarks} = options
  const plainSeries = []
  const plainToOriginal = new Map()

  for (const data of alignedData) {
    const seriesId = `${data.id}__plain`
    // Create per-series formatter with appropriate precision
    const seriesFormatter = getNumberFormatterWithPrecision(locale, data.precision ?? 0)

    plainSeries.push({
      id: seriesId,
      originalId: data.id,
      originalLabel: data.label,
      data: data.values,
      xAxisId: X_AXIS_ID,
      yAxisId: data.axisId,
      color: data.color,
      label: undefined,
      connectNulls: Boolean(data.connectNulls || data.area),
      ...(data.curve && {curve: data.curve}),
      ...(data.area && {area: true}),
      ...(data.stack && {stack: data.stack}),
      showMark({index}) {
        const point = data.pointsWithMeta[index]

        // If showMark property is explicitly set (from segment boundary detection), use it
        if (point && typeof point.showMark === 'boolean') {
          return point.showMark
        }

        // Only show explicit boundary marks or exposeAllMarks.
        return exposeAllMarks
      },
      valueFormatter(value) {
        if (value === null || Number.isNaN(value)) {
          return null
        }

        return seriesFormatter.format(value)
      }
    })

    plainToOriginal.set(seriesId, data.id)
  }

  return {plainSeries, plainToOriginal}
}

/**
 * Build stub series for legend display
 */
export const buildStubSeries = (processedSeries, xValuesLength) => processedSeries.map(processed => ({
  id: processed.id,
  originalId: processed.id,
  originalLabel: processed.label,
  label: processed.label,
  color: processed.color,
  data: Array.from({length: xValuesLength}).fill(null),
  xAxisId: X_AXIS_ID,
  yAxisId: processed.axisId,
  showMark: false,
  connectNulls: Boolean(processed.connectNulls || processed.area),
  valueFormatter: () => null,
  chartType: processed.chartType,
  ...(processed.curve && {curve: processed.curve}),
  ...(processed.area && {area: true}),
  ...(processed.stack && {stack: processed.stack})
}))

/**
 * Builds a single y-axis configuration
 * @param {string} axisId - The axis identifier
 * @param {object} stats - Statistics with min and max values
 * @param {string} locale - Locale string for number formatting
 * @param {number} precision - Number of decimal places to display
 * @param {string|null} label - Optional axis label
 * @returns {object} Y-axis configuration
 */
// eslint-disable-next-line max-params
const buildSingleYAxis = (axisId, stats, locale, precision, label = null, options = {}) => {
  const hasData = stats.min !== Number.POSITIVE_INFINITY
  const numberFormatter = getNumberFormatterWithPrecision(locale, precision)
  const reverse = Boolean(options.reverse && axisId === AXIS_LEFT_ID)

  // Create a default axis even if no data to prevent useYScale errors
  // This ensures both axes are always defined for React hooks consistency
  if (!hasData) {
    return {
      id: axisId,
      position: axisId === AXIS_LEFT_ID ? 'left' : 'right',
      scaleType: 'linear',
      label,
      valueFormatter(value) {
        if (value === null || value === undefined) {
          return ''
        }

        return numberFormatter.format(value)
      },
      min: 0,
      max: 1,
      reverse,
      hasData: false // Mark as empty for conditional rendering
    }
  }

  // Extend axis range to include zero when data doesn't already span it
  // Support both positive and negative values by extending the range to include zero
  let axisMin = options.includeZero === false ? stats.min : Math.min(0, stats.min)
  let axisMax = options.includeZero === false ? stats.max : Math.max(0, stats.max)

  if (axisId === AXIS_LEFT_ID && Number.isFinite(options.minimum)) {
    axisMin = options.minimum
  }

  if (axisId === AXIS_LEFT_ID && Number.isFinite(options.maximum)) {
    axisMax = options.maximum
  }

  // Prevent collapsed axis when min equals max
  if (axisMin === axisMax) {
    axisMin -= 1
    axisMax += 1
  }

  return {
    id: axisId,
    position: axisId === AXIS_LEFT_ID ? 'left' : 'right',
    scaleType: 'linear',
    label,
    valueFormatter(value) {
      if (value === null || value === undefined) {
        return ''
      }

      return numberFormatter.format(value)
    },
    min: axisMin,
    max: axisMax,
    reverse,
    hasData: true
  }
}

/**
 * Build y-axis configurations from statistics
 * @param {object} axisStats - Statistics per axis
 * @param {string} locale - Locale string for number formatting
 * @param {object} axisLabels - Optional labels per axis
 * @param {object} axisPrecision - Precision (decimal places) per axis
 * @returns {Array} Y-axis configurations
 */
export const buildYAxisConfigurations = (
  axisStats,
  locale,
  {
    axisLabels = {},
    axisPrecision = {},
    includeZero = true,
    reverse = false,
    minimum = null,
    maximum = null
  } = {}
) => {
  const options = {
    includeZero, reverse, minimum, maximum
  }

  return (
    [AXIS_LEFT_ID, AXIS_RIGHT_ID].map(axisId =>
      buildSingleYAxis(
        axisId,
        axisStats[axisId],
        locale,
        axisPrecision[axisId] ?? 0,
        axisLabels[axisId] ?? null,
        options
      )
    )
  )
}

/**
 * Extract static thresholds from processed series
 */
export const extractStaticThresholds = processedSeries => {
  const staticThresholds = []

  for (const processed of processedSeries) {
    if (typeof processed.threshold === 'number') {
      staticThresholds.push({
        axisId: processed.axisId,
        value: processed.threshold,
        color: processed.color
      })
    }
  }

  return staticThresholds
}

/**
 * Parse frequency string to approximate milliseconds (for fixed-duration units)
 * @param {string} frequency - Frequency string (e.g., '1 day', '15 minutes')
 * @returns {number|null} Milliseconds or null if parsing fails
 */
const parseFrequencyToMs = frequency => {
  const parsed = parseFrequency(frequency)
  if (!parsed) {
    return null
  }

  const {value, unit} = parsed

  const MS_PER_MINUTE = 60 * 1000
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const MS_PER_WEEK = 7 * MS_PER_DAY
  const MS_PER_MONTH = 30 * MS_PER_DAY
  const MS_PER_QUARTER = 90 * MS_PER_DAY
  const MS_PER_YEAR = 365 * MS_PER_DAY

  const unitMap = {
    second: 1000,
    minute: MS_PER_MINUTE,
    hour: MS_PER_HOUR,
    day: MS_PER_DAY,
    week: MS_PER_WEEK,
    month: MS_PER_MONTH,
    quarter: MS_PER_QUARTER,
    year: MS_PER_YEAR
  }

  return value * (unitMap[unit] ?? 0)
}

/**
 * Normalize a timestamp to the start of its calendar period
 * @param {number} timestamp - Timestamp in milliseconds
 * @param {string} unit - Calendar unit ('month', 'quarter', 'year')
 * @returns {number} Normalized timestamp at period start
 */
const normalizeToCalendarPeriodStart = (timestamp, unit) => {
  const date = new Date(timestamp)

  switch (unit) {
    case 'month': {
      // Start of month
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
    }

    case 'quarter': {
      // Start of quarter (Q1: Jan, Q2: Apr, Q3: Jul, Q4: Oct)
      const quarterMonth = Math.floor(date.getMonth() / 3) * 3
      return new Date(date.getFullYear(), quarterMonth, 1).getTime()
    }

    case 'year': {
      // Start of year
      return new Date(date.getFullYear(), 0, 1).getTime()
    }

    default: {
      return timestamp
    }
  }
}

/**
 * Generate a linear timeline from start to end timestamps at regular intervals
 * Uses calendar-based increments for month/quarter/year to handle variable durations
 * @param {number} startTs - Start timestamp in milliseconds
 * @param {number} endTs - End timestamp in milliseconds
 * @param {string} frequency - Frequency string (e.g., '1 day', '15 minutes', '1 month')
 * @returns {number[]} Array of timestamps at regular intervals
 */
const generateLinearTimelineFromTimestamps = (startTs, endTs, frequency) => {
  const parsed = parseFrequency(frequency)
  if (!parsed) {
    return []
  }

  const {value, unit} = parsed

  if (startTs >= endTs) {
    return []
  }

  // Limit the number of generated points to prevent memory issues
  const MAX_TIMELINE_POINTS = 10_000

  // For calendar-based units, use proper date arithmetic
  if (isCalendarBasedUnit(unit)) {
    // Normalize start to the beginning of its period
    const normalizedStart = normalizeToCalendarPeriodStart(startTs, unit)

    const timeline = []
    let currentDate = new Date(normalizedStart)

    while (currentDate.getTime() <= endTs && timeline.length < MAX_TIMELINE_POINTS) {
      timeline.push(currentDate.getTime())
      currentDate = addCalendarIncrement(currentDate, value, unit)
    }

    return timeline
  }

  // For fixed-duration units, use millisecond arithmetic
  const frequencyMs = parseFrequencyToMs(frequency)
  if (!frequencyMs || frequencyMs <= 0) {
    return []
  }

  const expectedPoints = Math.ceil((endTs - startTs) / frequencyMs) + 1

  if (expectedPoints > MAX_TIMELINE_POINTS) {
    // Return empty to fall back to non-linear mode
    return []
  }

  const timeline = []
  let current = startTs

  while (current <= endTs) {
    timeline.push(current)
    current += frequencyMs
  }

  return timeline
}

/**
 * Compute unified x-axis values and dates
 * Handles timeline generation with frequency or falls back to data-based axis
 * @param {Set} xValuesSet - Set of timestamp values from all series
 * @param {string|null} timelineFrequency - Optional frequency for linear timeline
 * @param {object|null} timelineRange - Optional range with start/end dates
 * @returns {{xValues: number[], xAxisDates: Date[]}}
 */
const computeUnifiedXAxis = (xValuesSet, timelineFrequency, timelineRange) => {
  let xValues
  let xAxisDates

  if (timelineFrequency && (xValuesSet.size > 0 || timelineRange)) {
    // Determine timeline bounds: prefer timelineRange if provided, fallback to data bounds
    let minTs
    let maxTs

    if (timelineRange?.start && timelineRange?.end) {
      // Use the user-selected range to ensure full coverage even without data
      minTs = timelineRange.start instanceof Date ? timelineRange.start.getTime() : timelineRange.start
      maxTs = timelineRange.end instanceof Date ? timelineRange.end.getTime() : timelineRange.end
    } else if (xValuesSet.size > 0) {
      // Fallback to data bounds
      const timestamps = [...xValuesSet]
      minTs = Math.min(...timestamps)
      maxTs = Math.max(...timestamps)
    } else {
      // No range and no data - nothing to generate
      minTs = null
      maxTs = null
    }

    // Generate linear timeline if we have valid bounds
    const linearTimeline = (minTs !== null && maxTs !== null)
      ? generateLinearTimelineFromTimestamps(minTs, maxTs, timelineFrequency)
      : []

    if (linearTimeline.length > 0) {
      // Use the linear timeline, but ensure all original data points are included
      const timelineSet = new Set(linearTimeline)

      // Add any original timestamps not covered by the timeline (e.g., due to rounding)
      for (const ts of xValuesSet) {
        timelineSet.add(ts)
      }

      xValues = [...timelineSet].sort((a, b) => a - b)
      xAxisDates = xValues.map(value => toDate(value))
    } else {
      // Fallback to original behavior if timeline generation fails
      xValues = [...xValuesSet].sort((a, b) => a - b)
      xAxisDates = xValues.map(value => toDate(value))
    }
  } else {
    xValues = [...xValuesSet].sort((a, b) => a - b)
    xAxisDates = xValues.map(value => toDate(value))
  }

  return {xValues, xAxisDates}
}

/**
 * Process all input series with decimation and threshold handling
 * @param {Array} series - Raw input series
 * @param {object} options - Processing options (enableThresholds, enableDecimation, etc.)
 * @returns {{processedSeries: Array, xValuesSet: Set, didDecimate: boolean}}
 */
const processSeriesWithDecimation = (series, options) => {
  const {
    enableThresholds,
    enableDecimation,
    decimationTarget,
    maxPointsBeforeDecimation
  } = options

  const xValuesSet = new Set()
  const processedSeries = []
  let didDecimate = false

  for (const inputSeries of series) {
    const processed = processInputSeries(inputSeries, {
      enableThresholds,
      enableDecimation,
      decimationTarget
    })

    if (enableDecimation
        && (processed.didDecimate || processed.sortedPoints.length > maxPointsBeforeDecimation)) {
      didDecimate = true
    }

    // Calculate threshold crossings
    const crossings = enableThresholds
      ? computeThresholdCrossings(processed.filteredPoints, processed.thresholdEvaluator)
      : []

    // Build unified point map
    const pointMap = buildPointMap(processed.filteredPoints, crossings, xValuesSet)

    // Store native frequency for potential resampling
    const nativeFrequency = inputSeries.frequency
      || detectNativeFrequency(processed.filteredPoints)

    const seriesItem = {
      id: processed.id,
      label: processed.label,
      color: processed.color,
      axisId: processed.axisId,
      thresholdEvaluator: processed.thresholdEvaluator,
      thresholdConfig: processed.threshold,
      threshold: processed.threshold, // Keep for extractStaticThresholds
      points: pointMap,
      chartType: processed.chartType || 'line',
      precision: processed.precision,
      connectNulls: processed.connectNulls,
      nativeFrequency, // Store for later resampling
      ...(processed.curve && {curve: processed.curve}),
      ...(processed.area && {area: true}),
      ...(processed.stack && {stack: processed.stack})
    }
    processedSeries.push(seriesItem)
  }

  return {processedSeries, xValuesSet, didDecimate}
}

/**
 * Extract axis labels and precision from processed series
 * @param {Array} processedSeries - Processed series with label and precision
 * @returns {{axisLabels: object, axisPrecision: object}}
 */
const extractAxisMetadata = processedSeries => {
  const axisLabels = {}
  const axisPrecision = {
    [AXIS_LEFT_ID]: 0,
    [AXIS_RIGHT_ID]: 0
  }

  for (const processed of processedSeries) {
    const {axisId, label, precision} = processed
    // Extract unit from label (format: "Parameter (unit)")
    const unitMatch = label?.match(/\(([^)]+)\)$/)
    if (unitMatch && !axisLabels[axisId]) {
      axisLabels[axisId] = unitMatch[1]
    }

    // Track max precision per axis
    axisPrecision[axisId] = Math.max(axisPrecision[axisId], precision ?? 0)
  }

  return {axisLabels, axisPrecision}
}

/**
 * Main orchestrator function that builds complete series model
 * Coordinates all sub-functions to transform raw series into chart-ready data
 */
export const buildSeriesModel = ({
  series,
  locale,
  theme,
  exposeAllMarks,
  enableThresholds = true,
  enableDecimation = true,
  decimationTarget = DECIMATION_TARGET,
  maxPointsBeforeDecimation = MAX_POINTS_BEFORE_DECIMATION,
  timelineFrequency = null,
  timelineRange = null,
  includeZero = true,
  reverseYAxis = false,
  yAxisLabel = null,
  yAxisMin = null,
  yAxisMax = null,
  visibilityModel = null
}) => {
  const axisStats = {
    [AXIS_LEFT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
    [AXIS_RIGHT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
  }

  // Step 1: Process series with decimation
  const {processedSeries, xValuesSet, didDecimate} = processSeriesWithDecimation(series, {
    enableThresholds,
    enableDecimation,
    decimationTarget,
    maxPointsBeforeDecimation
  })

  // Step 2.5: Resample coarser series to match the finest frequency
  // Find the series with the finest (smallest) frequency
  let finestFrequency = null
  let finestSeriesTimestamps = null

  for (const processed of processedSeries) {
    if (!processed.nativeFrequency) {
      continue
    }

    if (!finestFrequency || getFrequencyOrder(processed.nativeFrequency) < getFrequencyOrder(finestFrequency)) {
      finestFrequency = processed.nativeFrequency
      // Extract timestamps from this series
      finestSeriesTimestamps = [...processed.points.keys()].sort((a, b) => a - b)
    }
  }

  // Resample coarser series using the finest series' timestamps as targets
  const resampledSeries = processedSeries.map(processed => {
    // Skip if no resampling needed (no finest series found or this series has no frequency)
    if (!finestFrequency || !finestSeriesTimestamps || !processed.nativeFrequency) {
      return processed
    }

    // Skip if this IS the finest series or is finer than the finest
    if (getFrequencyOrder(processed.nativeFrequency) <= getFrequencyOrder(finestFrequency)) {
      return processed
    }

    // Resample using the finest series' real timestamps
    const resampledMap = resampleSeriesData(
      processed.points,
      finestSeriesTimestamps,
      processed.nativeFrequency,
      finestFrequency
    )

    return {
      ...processed,
      points: resampledMap
    }
  })

  // Update xValuesSet with resampled timestamps to ensure all real timestamps are included
  const updatedXValuesSet = new Set(xValuesSet)
  if (finestSeriesTimestamps) {
    for (const ts of finestSeriesTimestamps) {
      updatedXValuesSet.add(ts)
    }
  }

  // Step 2: Compute unified x-axis
  // Pass null for timelineFrequency to prevent linear grid generation when we're using real timestamps
  const effectiveTimelineFrequency = finestSeriesTimestamps ? null : timelineFrequency
  const {xValues, xAxisDates} = computeUnifiedXAxis(updatedXValuesSet, effectiveTimelineFrequency, timelineRange)

  // Step 3: Align all series to unified x-axis and update statistics
  const {metaBySeries, pointBySeries, alignedData} = alignSeriesToXAxis(
    resampledSeries, // Use resampled instead of processed
    xValues,
    xAxisDates,
    {axisStats, visibilityModel}
  )

  // Step 4: Build dynamic threshold series
  const dynamicThresholdSeries = enableThresholds
    ? buildDynamicThresholdSeries(alignedData, theme)
    : []

  // Step 5: Build segments or plain series
  let segmentSeries
  let segmentToOriginal
  if (enableThresholds) {
    const segments = buildSegments(alignedData, xValues, {
      locale,
      exposeAllMarks,
      theme
    })
    segmentSeries = segments.segmentSeries
    segmentToOriginal = segments.segmentToOriginal
  } else {
    const plain = buildPlainSeries(alignedData, {
      locale,
      exposeAllMarks
    })
    segmentSeries = plain.plainSeries
    segmentToOriginal = plain.plainToOriginal
  }

  // Step 6: Build stub series for legend
  const stubSeries = buildStubSeries(processedSeries, xValues.length)

  // Step 7: Extract static thresholds
  const staticThresholds = enableThresholds ? extractStaticThresholds(processedSeries) : []

  // Step 8: Extract axis metadata
  const {axisLabels, axisPrecision} = extractAxisMetadata(processedSeries)
  if (yAxisLabel) {
    axisLabels[AXIS_LEFT_ID] = yAxisLabel
  }

  // Step 9: Build y-axis configurations
  const yAxis = buildYAxisConfigurations(axisStats, locale, {
    axisLabels,
    axisPrecision,
    includeZero,
    reverse: reverseYAxis,
    minimum: yAxisMin,
    maximum: yAxisMax
  })

  return {
    xValues,
    xAxisDates,
    yAxis,
    segmentSeries,
    stubSeries,
    dynamicThresholdSeries,
    staticThresholds,
    segmentToOriginal,
    metaBySeries,
    pointBySeries,
    didDecimate
  }
}

/**
 * Creates a value formatter for x-axis tick labels based on aggregation frequency
 * The date format adapts to the frequency to ensure clarity and consistency
 * @param {string} locale - Locale string
 * @param {Date[]} dates - Array of dates representing visible x-axis range
 * @param {string} frequency - Aggregation frequency (e.g., '1 day', '1 month', '1 year')
 * @returns {Function} Formatter function for date values
 */
export const axisFormatterFactory = (locale, dates, frequency) => {
  const formatter = getRangeBasedDateFormatter(locale, dates, frequency)
  return value => formatter.format(value instanceof Date ? value : new Date(value))
}

export const buildAnnotations = ({pointBySeries, metaBySeries, visibility, theme}) => {
  const annotations = []
  for (const [seriesId, points] of pointBySeries.entries()) {
    if (visibility[seriesId] === false) {
      continue
    }

    for (const [index, point] of points.entries()) {
      if (!point || point.synthetic || point.y === null || Number.isNaN(point.y)) {
        continue
      }

      const resolvedMeta = point.meta ?? metaBySeries?.get(seriesId)?.[index] ?? null
      if (!resolvedMeta) {
        continue
      }

      annotations.push({
        seriesId,
        axisId: point.axisId,
        index,
        x: point.x,
        y: point.y,
        originalPoint: {...point, meta: resolvedMeta},
        color: theme.palette.info.main
      })
    }
  }

  return annotations
}
