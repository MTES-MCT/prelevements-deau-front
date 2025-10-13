/**
 * ChartWithRangeSlider Component
 *
 * Combines time series chart with range refinement slider
 */

'use client'

import {Box, Slider, Typography} from '@mui/material'
import {fr} from 'date-fns/locale'

import {formatSliderMark, formatSliderValue} from './formatters.js'

import TimeSeriesChart from '@/components/ui/TimeSeriesChart/index.js'

const DEFAULT_MIN_CHART_HEIGHT = 360

const ChartWithRangeSlider = ({
  series,
  locale,
  showRangeSlider,
  allDates,
  rangeIndices,
  sliderMarks,
  rangeLabel,
  onRangeChange,
  minChartHeight = DEFAULT_MIN_CHART_HEIGHT
}) => {
  if (series.length === 0) {
    return null
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{minHeight: minChartHeight}}>
        <TimeSeriesChart series={series} locale={locale} />
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
            valueLabelDisplay='auto'
            valueLabelFormat={idx => formatSliderMark(allDates[idx])}
            onChange={onRangeChange}
          />
        </Box>
      )}
    </Box>
  )
}

export default ChartWithRangeSlider
