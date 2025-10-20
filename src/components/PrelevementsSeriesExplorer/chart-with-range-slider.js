/**
 * ChartWithRangeSlider Component
 *
 * Combines time series chart with range refinement slider
 */

'use client'

import {useMemo, useCallback} from 'react'

import {Box, Slider, Typography} from '@mui/material'
import {fr} from 'date-fns/locale'

import {formatSliderMark, formatSliderValue} from './formatters.js'

import TimeSeriesChart from '@/components/ui/TimeSeriesChart/index.js'

const DEFAULT_MIN_CHART_HEIGHT = 360

/**
 * @param {Object} props - Component props
 * @param {Array} props.series - Chart series data passed to `TimeSeriesChart`
 * @param {string} props.locale - Locale identifier for formatting
 * @param {boolean} props.showRangeSlider - Toggle for the range slider visibility
 * @param {Array<Date>} props.allDates - Complete array of dates for the slider
 * @param {[number, number]} props.rangeIndices - Current range boundaries
 * @param {Array<Object>} props.sliderMarks - Slider marks configuration
 * @param {string} props.rangeLabel - Label displayed above the slider
 * @param {Function} props.onRangeChange - Slider change handler, receives same args as MUI `Slider` onChange
 * @param {number} [props.minChartHeight=DEFAULT_MIN_CHART_HEIGHT] - Minimum height for the chart container
 * @param {Object} [props.timeSeriesChartProps] - Additional props forwarded to `TimeSeriesChart`
 */
const ChartWithRangeSlider = ({
  series,
  locale,
  showRangeSlider,
  allDates,
  rangeIndices,
  sliderMarks,
  rangeLabel,
  onRangeChange,
  minChartHeight = DEFAULT_MIN_CHART_HEIGHT,
  timeSeriesChartProps
}) => {
  const resolvedChartProps = useMemo(() => {
    if (!timeSeriesChartProps) {
      return {locale}
    }

    const {series: _ignoredSeries, locale: overrideLocale, ...otherProps} = timeSeriesChartProps
    return {
      locale: overrideLocale ?? locale,
      ...otherProps
    }
  }, [locale, timeSeriesChartProps])

  const handleSliderChange = useCallback((event, value, activeThumb) => {
    onRangeChange?.(event, value, activeThumb)
  }, [onRangeChange])

  if (series.length === 0) {
    return null
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{minHeight: minChartHeight}}>
        <TimeSeriesChart
          series={series}
          {...resolvedChartProps}
        />
      </Box>

      {showRangeSlider && allDates.length > 1 && (
        <Box sx={{px: 2}}>
          <Typography variant='caption' className='mb-2 block'>
            {rangeLabel}
          </Typography>
          <Slider
            disableSwap
            getAriaValueText={idx => formatSliderValue(allDates[idx])}
            marks={sliderMarks}
            max={allDates.length - 1}
            min={0}
            slotProps={{
              valueLabel: {
                locale: fr
              }
            }}
            step={1}
            value={rangeIndices}
            valueLabelDisplay='on'
            valueLabelFormat={idx => formatSliderMark(allDates[idx])}
            onChange={handleSliderChange}
          />
        </Box>
      )}
    </Box>
  )
}

export default ChartWithRangeSlider
