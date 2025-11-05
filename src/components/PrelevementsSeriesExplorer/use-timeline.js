/**
 * Custom hook for managing timeline and range slider
 */

import {
  useMemo, useState, useEffect, useCallback
} from 'react'

import {format, addDays} from 'date-fns'

import {
  clamp,
  computeSliderMarks,
  fillDateGaps,
  parseLocalDate
} from './utils/index.js'

/**
 * Hook for managing timeline display and range selection
 *
 * @param {Array} timelineSamples - Timeline samples with timestamp precision
 * @param {boolean} showRangeSlider - Whether slider is enabled
 * @returns {Object} Timeline state and handlers
 */
export function useTimeline(timelineSamples, showRangeSlider) {
  // Collect unique day strings from samples to figure out the continuous day range.
  const baseDates = useMemo(() => {
    if (!Array.isArray(timelineSamples) || timelineSamples.length === 0) {
      return []
    }

    const uniqueDates = new Set()
    for (const sample of timelineSamples) {
      if (sample?.date) {
        uniqueDates.add(sample.date)
      }
    }

    return [...uniqueDates]
      .sort()
      .map(date => parseLocalDate(date))
      .filter(Boolean)
  }, [timelineSamples])

  // Fill any potential gaps to get a complete array of consecutive days.
  const {allDates: dayDates} = useMemo(() => {
    if (baseDates.length === 0) {
      return {allDates: []}
    }

    return fillDateGaps(baseDates)
  }, [baseDates])

  // Slider works on boundaries: [start, exclusive end]. We duplicate the last day + 1 midnight to allow midnight→midnight ranges.
  const sliderDates = useMemo(() => {
    if (dayDates.length === 0) {
      return []
    }

    const expanded = [...dayDates]
    const lastDay = dayDates.at(-1)
    expanded.push(addDays(lastDay, 1))

    return expanded
  }, [dayDates])

  // Range indices refer to positions within sliderDates, not the raw timelineSamples.
  const [rangeIndices, setRangeIndices] = useState([0, 0])

  // Reset range when dates change
  useEffect(() => {
    if (sliderDates.length > 0) {
      const defaultEnd = Math.max(1, sliderDates.length - 1)
      setRangeIndices([0, defaultEnd])
    }
  }, [sliderDates.length])

  // Visible date range is inclusive of start and exclusive of end, but expressed in day precision.
  const visibleDateRange = useMemo(() => {
    if (sliderDates.length === 0 || dayDates.length === 0) {
      return []
    }

    const rangeStart = sliderDates[rangeIndices[0]]
    const rangeEnd = sliderDates[rangeIndices[1]]

    if (!rangeStart || !rangeEnd || rangeEnd <= rangeStart) {
      return []
    }

    return dayDates.filter(date => date >= rangeStart && date < rangeEnd)
  }, [dayDates, sliderDates, rangeIndices])

  // Marks are built on whole days, we map them back to slider indices after expanding.
  const sliderMarks = useMemo(() => {
    if (sliderDates.length === 0) {
      return []
    }

    const dayMarks = computeSliderMarks(dayDates)
    return dayMarks
      .map(mark => {
        const dayDate = dayDates[mark.value]
        if (!dayDate) {
          return null
        }

        const sliderIndex = sliderDates.findIndex(date => date.getTime() === dayDate.getTime())
        if (sliderIndex === -1) {
          return null
        }

        return {
          value: sliderIndex,
          label: mark.label
        }
      })
      .filter(Boolean)
  }, [dayDates, sliderDates])

  // Filter samples by the currently selected window using their timestamp boundaries.
  const visibleSamples = useMemo(() => {
    if (sliderDates.length === 0 || !Array.isArray(timelineSamples)) {
      return []
    }

    const startDate = sliderDates[rangeIndices[0]]
    const endDate = sliderDates[rangeIndices[1]]

    if (!startDate || !endDate) {
      return []
    }

    return timelineSamples.filter(sample => {
      if (!sample?.timestamp) {
        return false
      }

      return sample.timestamp >= startDate && sample.timestamp < endDate
    })
  }, [sliderDates, rangeIndices, timelineSamples])

  const totalDates = sliderDates.length
  const maxIndex = Math.max(totalDates - 1, 0)
  // Minimum width of the window: 1 step → a full day when sliderDates include the +1 day boundary.
  const minSteps = totalDates > 1 ? 1 : 0
  const handleRangeChange = useCallback((event, newValue, activeThumb) => {
    if (!Array.isArray(newValue) || totalDates <= 1) {
      return
    }

    setRangeIndices(previous => {
      let [start, end] = newValue.map(value => clamp(Math.round(value), 0, maxIndex))

      if (start > end) {
        if (activeThumb === 0) {
          start = end
        } else if (activeThumb === 1) {
          end = start
        } else {
          start = Math.min(start, end)
          end = Math.max(start, end)
        }
      }

      if (minSteps > 0 && end - start < minSteps) {
        if (activeThumb === 0) {
          const adjustedStart = clamp(start, 0, maxIndex - minSteps)
          start = adjustedStart
          end = Math.min(maxIndex, adjustedStart + minSteps)
        } else if (activeThumb === 1) {
          const adjustedEnd = clamp(end, minSteps, maxIndex)
          end = adjustedEnd
          start = clamp(adjustedEnd - minSteps, 0, maxIndex - minSteps)
        } else {
          const adjustedStart = clamp(previous[0], 0, maxIndex - minSteps)
          start = adjustedStart
          end = Math.min(maxIndex, adjustedStart + minSteps)
        }
      }

      return [
        clamp(start, 0, maxIndex),
        clamp(end, 0, maxIndex)
      ]
    })
  }, [maxIndex, minSteps, totalDates])

  const handleCalendarDayClick = useCallback(value => {
    if (!value?.date || !showRangeSlider || dayDates.length === 0 || sliderDates.length <= 1) {
      return
    }

    const clickedDate = value.date

    // Detect the date format based on length and content
    // YYYY-MM-DD (day), YYYY-MM (month), or YYYY (year)
    let dayStartIndex = -1
    let dayEndIndex = -1

    switch (clickedDate.length) {
      case 10: {
        // Day format: YYYY-MM-DD
        dayStartIndex = dayDates.findIndex(d => format(d, 'yyyy-MM-dd') === clickedDate)
        dayEndIndex = dayStartIndex
        break
      }

      case 7: {
        // Month format: YYYY-MM
        // Find all dates within this month
        const [year, month] = clickedDate.split('-').map(Number)
        dayStartIndex = dayDates.findIndex(d =>
          d.getFullYear() === year && d.getMonth() === month - 1
        )

        if (dayStartIndex !== -1) {
          // Find the last date of this month in allDates
          let lastIndex = dayStartIndex
          while (
            lastIndex + 1 < dayDates.length
            && dayDates[lastIndex + 1].getFullYear() === year
            && dayDates[lastIndex + 1].getMonth() === month - 1
          ) {
            lastIndex++
          }

          dayEndIndex = lastIndex
        }

        break
      }

      case 4: {
        // Year format: YYYY
        const year = Number(clickedDate)
        dayStartIndex = dayDates.findIndex(d => d.getFullYear() === year)

        if (dayStartIndex !== -1) {
          // Find the last date of this year in allDates
          let lastIndex = dayStartIndex
          while (
            lastIndex + 1 < dayDates.length
            && dayDates[lastIndex + 1].getFullYear() === year
          ) {
            lastIndex++
          }

          dayEndIndex = lastIndex
        }

        break
      }

      default: {
        break
      }
    }

    if (dayStartIndex === -1 || dayEndIndex === -1) {
      return
    }

    const sliderStartIndex = dayStartIndex
    const sliderEndIndex = Math.min(sliderDates.length - 1, dayEndIndex + 1)

    if (sliderStartIndex === sliderEndIndex) {
      return
    }

    setRangeIndices([sliderStartIndex, sliderEndIndex])
  }, [dayDates, showRangeSlider, sliderDates])

  return {
    allDates: sliderDates,
    rangeIndices,
    visibleDateRange,
    visibleSamples,
    sliderMarks,
    handleRangeChange,
    handleCalendarDayClick
  }
}
