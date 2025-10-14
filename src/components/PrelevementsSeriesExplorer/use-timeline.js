/**
 * Custom hook for managing timeline and range slider
 */

import {
  useMemo, useState, useEffect, useCallback
} from 'react'

import {format} from 'date-fns'

import {
  fillDateGaps,
  computeSliderMarks,
  clamp
} from './util.js'

/**
 * Hook for managing timeline display and range selection
 *
 * @param {Array} dailyValues - Daily aggregated values
 * @param {boolean} showRangeSlider - Whether slider is enabled
 * @returns {Object} Timeline state and handlers
 */
export function useTimeline(dailyValues, showRangeSlider) {
  const dates = useMemo(() => dailyValues.map(v => new Date(v.date)), [dailyValues])

  const {allDates} = useMemo(() => {
    if (dates.length === 0) {
      return {allDates: []}
    }

    return fillDateGaps(dates)
  }, [dates])

  const [rangeIndices, setRangeIndices] = useState(() => [
    0,
    Math.max(0, allDates.length - 1)
  ])

  // Reset range when dates change
  useEffect(() => {
    if (allDates.length > 0) {
      setRangeIndices([0, allDates.length - 1])
    }
  }, [allDates.length])

  const visibleDateRange = useMemo(() => {
    if (allDates.length === 0) {
      return []
    }

    return allDates.slice(rangeIndices[0], rangeIndices[1] + 1)
  }, [allDates, rangeIndices])

  const sliderMarks = useMemo(() => computeSliderMarks(allDates), [allDates])

  const handleRangeChange = useCallback((event, newValue) => {
    if (!Array.isArray(newValue)) {
      return
    }

    const [start, end] = newValue
    if (end - start < 1) {
      return
    }

    setRangeIndices([
      clamp(start, 0, allDates.length - 1),
      clamp(end, 0, allDates.length - 1)
    ])
  }, [allDates.length])

  const handleCalendarDayClick = useCallback(value => {
    if (!value?.date || !showRangeSlider || allDates.length <= 1) {
      return
    }

    const clickedDate = value.date

    // Detect the date format based on length and content
    // YYYY-MM-DD (day), YYYY-MM (month), or YYYY (year)
    let startIndex = -1
    let endIndex = -1

    switch (clickedDate.length) {
      case 10: {
        // Day format: YYYY-MM-DD
        startIndex = allDates.findIndex(d => format(d, 'yyyy-MM-dd') === clickedDate)
        endIndex = startIndex === -1 ? -1 : Math.min(allDates.length - 1, startIndex + 1)
        break
      }

      case 7: {
        // Month format: YYYY-MM
        // Find all dates within this month
        const [year, month] = clickedDate.split('-').map(Number)
        startIndex = allDates.findIndex(d =>
          d.getFullYear() === year && d.getMonth() === month - 1
        )

        if (startIndex !== -1) {
          // Find the last date of this month in allDates
          let lastIndex = startIndex
          while (
            lastIndex + 1 < allDates.length
            && allDates[lastIndex + 1].getFullYear() === year
            && allDates[lastIndex + 1].getMonth() === month - 1
          ) {
            lastIndex++
          }

          endIndex = lastIndex
        }

        break
      }

      case 4: {
        // Year format: YYYY
        const year = Number(clickedDate)
        startIndex = allDates.findIndex(d => d.getFullYear() === year)

        if (startIndex !== -1) {
          // Find the last date of this year in allDates
          let lastIndex = startIndex
          while (
            lastIndex + 1 < allDates.length
            && allDates[lastIndex + 1].getFullYear() === year
          ) {
            lastIndex++
          }

          endIndex = lastIndex
        }

        break
      }

      default: {
        break
      }
    }

    if (startIndex === -1 || endIndex === -1) {
      return
    }

    setRangeIndices([startIndex, endIndex])
  }, [allDates, showRangeSlider])

  return {
    allDates,
    rangeIndices,
    visibleDateRange,
    sliderMarks,
    handleRangeChange,
    handleCalendarDayClick
  }
}
