'use client'

import {useMemo} from 'react'

import {Box, Paper, Typography} from '@mui/material'
import {BarChart} from '@mui/x-charts/BarChart'

import {
  getDateFormatter,
  getNumberFormatter,
  toTimestamp
} from '@/components/ui/TimeSeriesChart/util.js'

const DEFAULT_TRANSLATIONS = {
  chartAriaLabel: 'Histogramme séries temporelles',
  noDataAvailable: 'Aucune donnée disponible.'
}

const createAxisTooltip = (dateFormatter, numberFormatter) => {
  const AxisTooltip = ({axisValue, series, dataIndex}) => {
    if (axisValue === undefined || axisValue === null || dataIndex === null || dataIndex === undefined) {
      return null
    }

    const formattedAxisValue = dateFormatter.format(new Date(axisValue))

    const items = series
      .map(item => {
        const value = item.data?.[dataIndex]
        if (value === null || value === undefined) {
          return null
        }

        const formattedValue = item.valueFormatter
          ? item.valueFormatter(value)
          : numberFormatter.format(value)

        return {
          label: item.label ?? item.id,
          color: item.color,
          value: formattedValue
        }
      })
      .filter(Boolean)

    if (items.length === 0) {
      return null
    }

    return (
      <Paper
        elevation={4}
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minWidth: 200
        }}
      >
        <Typography variant='caption' sx={{fontWeight: 600}}>
          {formattedAxisValue}
        </Typography>
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.75}}>
          {items.map(item => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <Box
                  component='span'
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: item.color ?? 'text.secondary'
                  }}
                />
                <Typography variant='body2'>{item.label}</Typography>
              </Box>
              <Typography variant='body2' sx={{fontWeight: 600}}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    )
  }

  AxisTooltip.displayName = 'TimeSeriesBarChartTooltip'
  return AxisTooltip
}

const buildChartModel = (series, numberFormatter) => {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      xValues: [],
      barSeries: [],
      axisKeys: new Set()
    }
  }

  const xValueSet = new Set()
  const normalizedSeries = []
  const axisKeys = new Set()

  for (const serie of series) {
    if (!serie || !Array.isArray(serie.data)) {
      continue
    }

    const yAxisKey = serie.axis === 'right' ? 'y-right' : 'y-left'
    axisKeys.add(yAxisKey)

    const pointMap = new Map()
    for (const point of serie.data) {
      if (!point?.x) {
        continue
      }

      const timestamp = toTimestamp(point.x)
      xValueSet.add(timestamp)

      if (point.y === null || Number.isNaN(point.y)) {
        pointMap.set(timestamp, null)
      } else {
        pointMap.set(timestamp, point.y)
      }
    }

    normalizedSeries.push({
      original: serie,
      yAxisKey,
      points: pointMap
    })
  }

  const xValues = [...xValueSet].sort((a, b) => a - b)

  const barSeries = normalizedSeries
    .map(({original, yAxisKey, points}) => {
      const data = xValues.map(timestamp => points.get(timestamp) ?? null)

      if (data.every(value => value === null)) {
        return null
      }

      return {
        id: original.id,
        label: original.label,
        color: original.color,
        data,
        yAxisKey,
        valueFormatter: value => (value === null ? null : numberFormatter.format(value))
      }
    })
    .filter(Boolean)

  return {
    xValues,
    barSeries,
    axisKeys
  }
}

const buildYAxis = (axisKeys, numberFormatter) => {
  if (axisKeys.size === 0) {
    return [{
      id: 'y-left',
      scaleType: 'linear',
      position: 'left',
      valueFormatter: value => numberFormatter.format(value)
    }]
  }

  const axes = []

  if (axisKeys.has('y-left')) {
    axes.push({
      id: 'y-left',
      scaleType: 'linear',
      position: 'left',
      valueFormatter: value => numberFormatter.format(value)
    })
  }

  if (axisKeys.has('y-right')) {
    axes.push({
      id: 'y-right',
      scaleType: 'linear',
      position: 'right',
      valueFormatter: value => numberFormatter.format(value)
    })
  }

  return axes
}

const TimeSeriesBarChart = ({
  series,
  locale = 'fr-FR',
  translations,
  height = 360,
  slots,
  slotProps,
  margin,
  ..._unusedProps
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...translations}

  const dateFormatter = useMemo(() => getDateFormatter(locale), [locale])
  const numberFormatter = useMemo(() => getNumberFormatter(locale), [locale])

  const {xValues, barSeries, axisKeys} = useMemo(
    () => buildChartModel(series, numberFormatter),
    [series, numberFormatter]
  )

  const defaultTooltip = useMemo(
    () => createAxisTooltip(dateFormatter, numberFormatter),
    [dateFormatter, numberFormatter]
  )

  const resolvedXAxis = useMemo(() => [{
    id: 'time',
    data: xValues,
    scaleType: 'band',
    valueFormatter: value => dateFormatter.format(new Date(value))
  }], [xValues, dateFormatter])

  const resolvedYAxis = useMemo(
    () => buildYAxis(axisKeys, numberFormatter),
    [axisKeys, numberFormatter]
  )

  const resolvedSlots = useMemo(() => {
    const baseSlots = slots ?? {}
    return {
      ...baseSlots,
      axisContent: baseSlots.axisContent ?? defaultTooltip
    }
  }, [slots, defaultTooltip])

  if (barSeries.length === 0 || xValues.length === 0) {
    return (
      <Typography variant='body2'>
        {t.noDataAvailable}
      </Typography>
    )
  }

  return (
    <BarChart
      aria-label={t.chartAriaLabel}
      height={height}
      margin={margin}
      series={barSeries}
      slots={resolvedSlots}
      slotProps={slotProps}
      xAxis={resolvedXAxis}
      yAxis={resolvedYAxis}
    />
  )
}

export default TimeSeriesBarChart
