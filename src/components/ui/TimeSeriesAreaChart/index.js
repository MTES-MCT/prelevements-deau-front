'use client'

import {useMemo} from 'react'

import {Typography} from '@mui/material'
import {LineChart} from '@mui/x-charts/LineChart'

import {
  alignSeriesData,
  buildYAxisConfigs,
  createDefaultAxisTooltip,
  useTimeSeriesFormatters
} from '@/components/ui/time-series-shared.js'

const DEFAULT_TRANSLATIONS = {
  chartAriaLabel: 'Courbe moyenne',
  noDataAvailable: 'Aucune donnée disponible.'
}

const TimeSeriesAreaChart = ({
  series,
  locale = 'fr-FR',
  translations,
  height = 360,
  slots,
  slotProps,
  margin,
  curve = 'monotoneX',
  showMarks = false,
  connectNulls = false,
  ..._unusedProps
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...translations}

  const {dateFormatter, numberFormatter} = useTimeSeriesFormatters(locale)

  const {xValues, alignedSeries, axisKeys} = useMemo(
    () => alignSeriesData(series),
    [series]
  )

  const areaSeries = useMemo(() => alignedSeries.map(item => ({
    id: item.id,
    label: item.label,
    color: item.color,
    data: item.data,
    yAxisKey: item.axisKey,
    area: true,
    curve,
    showMark: showMarks,
    connectNulls,
    valueFormatter: value => (value === null ? null : numberFormatter.format(value))
  })), [alignedSeries, numberFormatter, curve, showMarks, connectNulls])

  const defaultTooltip = useMemo(
    () => createDefaultAxisTooltip(dateFormatter, numberFormatter),
    [dateFormatter, numberFormatter]
  )

  const resolvedXAxis = useMemo(() => [{
    id: 'time',
    data: xValues,
    scaleType: 'time',
    valueFormatter: value => dateFormatter.format(new Date(value))
  }], [xValues, dateFormatter])

  const resolvedYAxis = useMemo(
    () => buildYAxisConfigs(axisKeys, numberFormatter),
    [axisKeys, numberFormatter]
  )

  const resolvedSlots = useMemo(() => ({
    ...(slots ?? {}),
    axisContent: slots?.axisContent ?? defaultTooltip
  }), [slots, defaultTooltip])

  if (areaSeries.length === 0 || xValues.length === 0) {
    return (
      <Typography variant='body2'>
        {t.noDataAvailable}
      </Typography>
    )
  }

  return (
    <LineChart
      aria-label={t.chartAriaLabel}
      height={height}
      margin={margin}
      series={areaSeries}
      slots={resolvedSlots}
      slotProps={slotProps}
      xAxis={resolvedXAxis}
      yAxis={resolvedYAxis}
    />
  )
}

export default TimeSeriesAreaChart
