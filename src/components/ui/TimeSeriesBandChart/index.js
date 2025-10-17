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
  chartAriaLabel: 'Plage min/max',
  noDataAvailable: 'Aucune donnée disponible.'
}

const bandStackId = 'band-range'

const TimeSeriesBandChart = ({
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
  const {xValues, alignedSeries} = useMemo(
    () => alignSeriesData(series),
    [series]
  )

  if (!xValues || xValues.length === 0 || alignedSeries.length === 0) {
    return (
      <Typography variant='body2'>
        {t.noDataAvailable}
      </Typography>
    )
  }

  const minSeries = alignedSeries.find(item => item.valueType === 'minimum')
  const maxSeries = alignedSeries.find(item => item.valueType === 'maximum')

  if (!minSeries || !maxSeries) {
    return (
      <Typography variant='body2'>
        {t.noDataAvailable}
      </Typography>
    )
  }

  const bandAxisKey = maxSeries.axisKey === minSeries.axisKey
    ? maxSeries.axisKey
    : maxSeries.axisKey ?? minSeries.axisKey ?? 'y-left'

  const rangeData = useMemo(() => maxSeries.data.map((value, index) => {
    const minValue = minSeries.data[index]
    if (value === null || value === undefined || minValue === null || minValue === undefined) {
      return null
    }

    const delta = value - minValue
    if (Number.isNaN(delta) || delta < 0) {
      return null
    }

    return delta
  }), [maxSeries, minSeries])

  const bandSeries = useMemo(() => [
    {
      id: minSeries.id,
      label: minSeries.label,
      color: minSeries.color,
      data: minSeries.data,
      yAxisKey: bandAxisKey,
      stack: bandStackId,
      area: false,
      curve,
      showMark: showMarks,
      connectNulls,
      valueFormatter: value => (value === null ? null : numberFormatter.format(value))
    },
    {
      id: `${maxSeries.id}__band`,
      label: maxSeries.label,
      color: maxSeries.color,
      data: rangeData,
      yAxisKey: bandAxisKey,
      stack: bandStackId,
      area: true,
      curve,
      showMark: showMarks,
      connectNulls,
      valueFormatter: (_value, context) => {
        const dataIndex = context?.dataIndex
        if (dataIndex === null || dataIndex === undefined) {
          return null
        }

        const maxValue = maxSeries.data[dataIndex]
        if (maxValue === null || maxValue === undefined) {
          return null
        }

        return numberFormatter.format(maxValue)
      }
    }
  ], [
    minSeries,
    maxSeries,
    bandAxisKey,
    curve,
    showMarks,
    connectNulls,
    numberFormatter,
    rangeData
  ])

  const supplementalSeries = useMemo(() => alignedSeries
    .filter(item => item.valueType !== 'minimum' && item.valueType !== 'maximum')
    .map(item => ({
      id: item.id,
      label: item.label,
      color: item.color,
      data: item.data,
      yAxisKey: item.axisKey,
      area: false,
      curve,
      showMark: showMarks,
      connectNulls,
      valueFormatter: value => (value === null ? null : numberFormatter.format(value))
    })), [alignedSeries, curve, showMarks, connectNulls, numberFormatter])

  const chartSeries = useMemo(
    () => [...bandSeries, ...supplementalSeries],
    [bandSeries, supplementalSeries]
  )

  const axisKeys = useMemo(
    () => new Set(chartSeries.map(item => item.yAxisKey)),
    [chartSeries]
  )
  const resolvedYAxis = useMemo(
    () => buildYAxisConfigs(axisKeys, numberFormatter),
    [axisKeys, numberFormatter]
  )

  const resolvedXAxis = useMemo(() => [{
    id: 'time',
    data: xValues,
    scaleType: 'time',
    valueFormatter: value => dateFormatter.format(new Date(value))
  }], [xValues, dateFormatter])

  const defaultTooltip = useMemo(
    () => createDefaultAxisTooltip(dateFormatter, numberFormatter),
    [dateFormatter, numberFormatter]
  )
  const resolvedSlots = useMemo(() => ({
    ...(slots ?? {}),
    axisContent: slots?.axisContent ?? defaultTooltip
  }), [slots, defaultTooltip])

  const hasRenderableSeries = chartSeries.some(item => item.data.some(value => value !== null))
  if (!hasRenderableSeries) {
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
      series={chartSeries}
      slots={resolvedSlots}
      slotProps={slotProps}
      xAxis={resolvedXAxis}
      yAxis={resolvedYAxis}
    />
  )
}

export default TimeSeriesBandChart
