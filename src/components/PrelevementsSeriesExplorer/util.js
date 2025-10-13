/**
 * Utility functions for PrelevementsSeriesExplorer component
 */

import {
  addDays, differenceInCalendarDays, isSameDay, startOfDay, parseISO
} from 'date-fns'

import {CALENDAR_STATUS_COLORS} from './constants.js'

/**
 * Color priority map for calendar aggregation
 * Lower number = higher priority (more important to display)
 * Priority order:
 * 1. Present (default blue - highest priority)
 * 2. No sampling (info blue)
 * 3. Not declared (grey - lowest priority)
 */
const COLOR_PRIORITY = {
  [CALENDAR_STATUS_COLORS.present]: 1,
  [CALENDAR_STATUS_COLORS.noSampling]: 2,
  [CALENDAR_STATUS_COLORS.notDeclared]: 3
}

/**
 * Determines which color should take precedence based on priority
 * @param {Array<string>} colors - Array of color hex codes
 * @returns {string} The color with highest priority
 */
function selectPriorityColor(colors) {
  if (!colors || colors.length === 0) {
    return CALENDAR_STATUS_COLORS.present
  }

  // Filter out null/undefined
  const validColors = colors.filter(Boolean)

  if (validColors.length === 0) {
    return CALENDAR_STATUS_COLORS.present
  }

  // Find color with lowest priority number (highest priority)
  let bestColor = validColors[0]
  let bestPriority = COLOR_PRIORITY[validColors[0]] ?? 999

  for (const color of validColors) {
    const priority = COLOR_PRIORITY[color] ?? 999
    if (priority < bestPriority) {
      bestPriority = priority
      bestColor = color
    }
  }

  return bestColor
}

/**
 * Builds a map of series metadata indexed by parameter name
 * @param {Array} seriesList - Array of series objects with metadata
 * @returns {Map} Map of parameter name to series metadata
 */
export function buildSeriesMetadataMap(seriesList) {
  const map = new Map()
  for (const serie of seriesList) {
    if (serie.parameter) {
      map.set(serie.parameter, serie)
    }
  }

  return map
}

/**
 * Process calendar availability entries for a series
 * @param {Array} availability - Calendar availability entries
 * @param {Object} dateRange - Date range with start and end
 * @param {Object} serie - Series metadata
 * @param {Object} statusColors - Color mapping for calendar statuses
 * @returns {Array} Processed calendar entries
 */
function processCalendarAvailability(availability, dateRange, serie, statusColors) {
  const entries = []

  for (const item of availability) {
    if (!item?.date) {
      continue
    }

    const availabilityDate = new Date(item.date)
    if (Number.isNaN(availabilityDate.getTime())) {
      continue
    }

    if (availabilityDate < dateRange.start || availabilityDate > dateRange.end) {
      continue
    }

    const statusColor = item.status ? statusColors[item.status] : undefined
    const color = item.color ?? statusColor ?? serie.color ?? '#0078f3'

    entries.push({
      ...item,
      date: item.date,
      color
    })
  }

  return entries
}

/**
 * Builds calendar data entries from series metadata and date range
 * Only processes series with explicit calendarAvailability data
 * @param {Array} seriesList - Array of series with minDate/maxDate
 * @param {Object} dateRange - Date range with start and end
 * @param {Function} _formatFn - Function to format dates (unused, kept for API compatibility)
 * @param {Object} [statusColors=CALENDAR_STATUS_COLORS] - Color mapping for calendar statuses
 * @returns {Array} Calendar entries
 */
export function buildCalendarEntriesFromMetadata(seriesList, dateRange, _formatFn, statusColors = CALENDAR_STATUS_COLORS) {
  const calendars = []

  for (const serie of seriesList) {
    if (!serie.minDate || !serie.maxDate) {
      continue
    }

    // Use calendarAvailability if provided
    if (Array.isArray(serie.calendarAvailability) && serie.calendarAvailability.length > 0) {
      const entries = processCalendarAvailability(serie.calendarAvailability, dateRange, serie, statusColors)
      calendars.push(...entries)
      continue
    }

    // Only generate calendar entries for series without calendarAvailability
    // if explicitly requested (for backward compatibility)
    // Skip series that don't have explicit calendar data
    // This prevents all series from generating overlapping calendars
    continue
  }

  return calendars
}

/**
 * Calculates selectable periods from series metadata
 * @param {Array} seriesList - Array of series with minDate/maxDate
 * @returns {Object} Selectable periods with years and months ranges
 */
export function calculateSelectablePeriodsFromSeries(seriesList) {
  const allDates = []
  for (const serie of seriesList) {
    if (serie.minDate) {
      allDates.push(new Date(serie.minDate))
    }

    if (serie.maxDate) {
      allDates.push(new Date(serie.maxDate))
    }
  }

  if (allDates.length === 0) {
    return {years: []}
  }

  const minDate = new Date(Math.min(...allDates))
  const maxDate = new Date(Math.max(...allDates))
  const minYear = minDate.getFullYear()
  const maxYear = maxDate.getFullYear()

  const years = []
  for (let year = minYear; year <= maxYear; year++) {
    years.push(year)
  }

  return {
    years,
    months: {start: minDate, end: maxDate}
  }
}

/**
 * Builds a complete date range with missing dates filled in
 * @param {Date[]} dates - Array of dates to fill gaps between
 * @returns {{allDates: Date[], indexMap: Map<number, number>}} Complete date range and mapping from original indices
 */
export function fillDateGaps(dates) {
  if (dates.length === 0) {
    return {allDates: [], indexMap: new Map()}
  }

  const startDate = startOfDay(dates[0])
  const endDate = startOfDay(dates.at(-1))
  const totalDays = differenceInCalendarDays(endDate, startDate)

  const allDates = Array.from({length: totalDays + 1}, (_, i) => addDays(startDate, i))

  // Create mapping from filled array index to original array index
  const indexMap = new Map()
  for (const [originalIdx, date] of dates.entries()) {
    const filledIdx = allDates.findIndex(d => isSameDay(d, date))
    if (filledIdx !== -1) {
      indexMap.set(filledIdx, originalIdx)
    }
  }

  return {allDates, indexMap}
}

/**
 * Converts period objects to date range
 * @param {Array<{type: string, year: number, month?: number, value?: number}>} periods - Selected periods
 * @returns {{start: Date, end: Date} | null} Date range or null if no periods
 */
export function periodsToDateRange(periods) {
  if (!periods || periods.length === 0) {
    return null
  }

  const dates = periods.map(period => {
    if (period.type === 'year') {
      return new Date(period.value, 0, 1)
    }

    if (period.type === 'month') {
      return new Date(period.year, period.month, 1)
    }

    return null
  }).filter(Boolean)

  if (dates.length === 0) {
    return null
  }

  dates.sort((a, b) => a.getTime() - b.getTime())

  const start = dates[0]
  const lastPeriod = periods.at(-1)

  // Calculate end date based on period type
  let end
  if (lastPeriod.type === 'year') {
    // Last day of the year
    end = new Date(lastPeriod.value, 11, 31)
  } else {
    // Last day of the month
    end = new Date(lastPeriod.year, lastPeriod.month + 1, 0)
  }

  return {start, end}
}

/**
 * Formats date range for display
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {string} [locale='fr-FR'] - Locale for formatting
 * @returns {string} Formatted date range string
 */
export function formatDateRange(start, end, locale = 'fr-FR') {
  if (!start || !end) {
    return ''
  }

  const options = {year: 'numeric', month: 'long', day: 'numeric'}
  const formatter = new Intl.DateTimeFormat(locale, options)

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

/**
 * Determines color for calendar entry based on data presence
 * @param {Object} entry - Calendar entry
 * @returns {string} Color hex code
 */
function determineEntryColor(entry) {
  const {color: entryColor} = entry

  if (entryColor) {
    return entryColor
  }

  if (entry.values) {
    const hasData = entry.values.some(v => v !== null && v !== undefined)
    const allNull = entry.values.every(v => v === null || v === undefined)
    return hasData ? '#0078f3' : (allNull ? '#e5e5e5' : '#fee2e2')
  }

  return '#0078f3'
}

/**
 * Groups calendar entries by year for year view (showing 12 months per year)
 * Returns one calendar per year with month entries in YYYY-MM format
 * @param {Array} values - Calendar values
 * @returns {Array<Array<{date: string, color: string}>>} One array per year
 */
function groupByYear(values) {
  const yearGroups = new Map()

  // Group entries by year and month
  for (const entry of values) {
    const date = parseISO(entry.date)
    const year = date.getFullYear()
    const month = date.getMonth()

    if (!yearGroups.has(year)) {
      yearGroups.set(year, new Map())
    }

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthData = yearGroups.get(year)

    if (!monthData.has(monthKey)) {
      monthData.set(monthKey, [])
    }

    const color = determineEntryColor(entry)
    monthData.get(monthKey).push(color)
  }

  // Create one calendar per year with 12 month entries
  const yearCalendars = []
  for (const [year, monthData] of yearGroups) {
    const monthEntries = []

    // Generate all 12 months for the year
    for (let month = 0; month < 12; month++) {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
      const colors = monthData.get(monthKey)

      if (colors && colors.length > 0) {
        // Select color based on priority:
        // 1. Present (highest priority)
        // 2. No sampling
        // 3. Not declared (lowest priority)
        const dominantColor = selectPriorityColor(colors)

        monthEntries.push({
          date: monthKey,
          color: dominantColor
        })
      }
    }

    // Only add year calendar if it has at least one month with data
    if (monthEntries.length > 0) {
      yearCalendars.push(monthEntries)
    }
  }

  return yearCalendars
}

/**
 * Groups calendar entries by month for month view
 * @param {Array} values - Calendar values
 * @returns {Array<Array<{date: string, color: string}>>} Grouped by month
 */
function groupByMonth(values) {
  const monthGroups = new Map()

  for (const entry of values) {
    const date = parseISO(entry.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, [])
    }

    const color = determineEntryColor(entry)

    monthGroups.get(monthKey).push({
      date: entry.date,
      color,
      ...entry
    })
  }

  return [...monthGroups.values()]
}

/**
 * Builds calendar data for CalendarGrid from time series values
 * Automatically detects the appropriate grouping mode:
 * - Multiple years → group by year (returns YYYY format for years view)
 * - Single year, multiple months → group by month (returns YYYY-MM-DD format for month view)
 *
 * @param {Array<{date: string, values?: Array<number|null>, color?: string}>} values - Time series values
 * @returns {Array<Array<{date: string, color?: string}>>} Calendar data grouped by period
 */
export function buildCalendarData(values) {
  if (!values || values.length === 0) {
    return []
  }

  // Detect unique years in the data
  const years = new Set()
  for (const entry of values) {
    const date = parseISO(entry.date)
    years.add(date.getFullYear())
  }

  // If multiple years, group by year for years view
  if (years.size > 1) {
    return groupByYear(values)
  }

  // Single year: group by month for month view
  return groupByMonth(values)
}

/**
 * Filters series data by selected parameters
 * @param {Array<{id: string, data: Array}>} series - All series
 * @param {Array<string>} selectedParams - Selected parameter IDs
 * @returns {Array<{id: string, data: Array}>} Filtered series
 */
export function filterSeriesByParameters(series, selectedParams) {
  if (!selectedParams || selectedParams.length === 0) {
    return []
  }

  return series.filter(s => selectedParams.includes(s.id))
}

/**
 * Extracts unique units from parameters
 * @param {Array<{parameter: string, unit: string}>} parameters - Available parameters
 * @returns {Array<string>} Unique units
 */
export function getUniqueUnits(parameters) {
  if (!parameters) {
    return []
  }

  return [...new Set(parameters.map(param => param.unit).filter(Boolean))]
}

/**
 * Validates parameter selection against unit constraints
 * @param {Array<string>} selectedParams - Selected parameter names
 * @param {Array<{parameter: string, unit: string}>} parameters - Available parameters
 * @param {number} [maxUnits=2] - Maximum number of different units allowed
 * @returns {{valid: boolean, message?: string}} Validation result
 */
export function validateParameterSelection(selectedParams, parameters, maxUnits = 2) {
  if (!selectedParams || selectedParams.length === 0) {
    return {valid: true}
  }

  const paramMap = new Map()
  for (const param of parameters) {
    paramMap.set(param.parameter, param)
  }

  const selectedUnits = new Set()

  for (const paramName of selectedParams) {
    const param = paramMap.get(paramName)
    if (param?.unit) {
      selectedUnits.add(param.unit)
    }
  }

  if (selectedUnits.size > maxUnits) {
    return {
      valid: false,
      message: `Maximum ${maxUnits} unités différentes autorisées`
    }
  }

  return {valid: true}
}

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Computes slider marks for date range
 * @param {Array<Date>} dates - Array of dates
 * @param {number} [maxMarks=5] - Maximum number of marks to display
 * @returns {Array<{value: number, label: string}>} Slider marks
 */
export function computeSliderMarks(dates, maxMarks = 5) {
  if (!dates || dates.length === 0) {
    return []
  }

  if (dates.length <= maxMarks) {
    return dates.map((date, idx) => ({
      value: idx,
      label: date.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})
    }))
  }

  const step = Math.floor(dates.length / (maxMarks - 1))
  const marks = []

  for (let i = 0; i < maxMarks - 1; i++) {
    const idx = i * step
    marks.push({
      value: idx,
      label: dates[idx].toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})
    })
  }

  // Always include last date
  marks.push({
    value: dates.length - 1,
    label: dates.at(-1).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})
  })

  return marks
}

/**
 * Transforms series data structure to component-compatible format
 * @param {Array<Object>} seriesList - Array of series with metadata and values
 * @returns {Object} Transformed data with dailyValues and parameters
 */
export function transformSeriesToData(seriesList) {
  if (!seriesList || seriesList.length === 0) {
    return {dailyValues: [], dailyParameters: [], hasSubDaily: false}
  }

  // Collect all unique dates from all series
  const dateMap = new Map()
  const parameters = []
  let hasSubDaily = false

  for (const {series, values} of seriesList) {
    if (!series || !values) {
      continue
    }

    hasSubDaily ||= series.hasSubDaily

    // Add parameter info
    parameters.push({
      parameter: series.parameter,
      unit: series.unit,
      color: series.color || '#0078f3',
      frequency: series.frequency,
      valueType: series.valueType
    })

    // Process values
    for (const dayEntry of values) {
      if (!dateMap.has(dayEntry.date)) {
        dateMap.set(dayEntry.date, {
          date: dayEntry.date,
          values: Array.from({length: seriesList.length}, () => null),
          subDailyValues: []
        })
      }

      const entry = dateMap.get(dayEntry.date)
      const seriesIndex = seriesList.indexOf(seriesList.find(s => s.series === series))

      // Handle sub-daily values (with time)
      if (Array.isArray(dayEntry.values)) {
        const dailyValues = dayEntry.values.map(v => v.value)
        // Use average for daily aggregation
        const average = dailyValues.reduce((a, b) => a + (b || 0), 0) / dailyValues.length
        entry.values[seriesIndex] = average || null

        // Store sub-daily data
        entry.subDailyValues[seriesIndex] = dayEntry.values.map(v => ({
          time: v.time,
          value: v.value,
          remark: v.remark
        }))
      } else if (typeof dayEntry.values === 'number') {
        // Direct daily value
        entry.values[seriesIndex] = dayEntry.values
      }
    }
  }

  // Convert map to array and sort by date
  const dailyValues = [...dateMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date))

  return {
    dailyValues,
    dailyParameters: parameters,
    hasSubDaily
  }
}
