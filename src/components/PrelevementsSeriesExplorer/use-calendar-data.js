/**
 * Custom hook for managing calendar data
 */

import {useMemo} from 'react'

import {format} from 'date-fns'

import {
  buildCalendarData,
  buildCalendarEntriesFromMetadata
} from './util.js'

/**
 * Builds calendar grid data from series metadata
 *
 * @param {boolean} showCalendar - Whether calendar should be displayed
 * @param {Object} dateRange - Date range with start and end
 * @param {Array} seriesList - List of series with metadata
 * @returns {Array} Calendar data for display
 */
export function useCalendarData(showCalendar, dateRange, seriesList) {
  return useMemo(() => {
    if (!showCalendar || !dateRange) {
      return []
    }

    const calendars = buildCalendarEntriesFromMetadata(
      seriesList,
      dateRange,
      date => format(date, 'yyyy-MM-dd')
    )

    return buildCalendarData(calendars)
  }, [showCalendar, dateRange, seriesList])
}
