'use client'

import {useMemo} from 'react'

import {Box, Paper, Typography} from '@mui/material'

import {
  getDateFormatter,
  getNumberFormatter,
  toTimestamp
} from '@/components/ui/TimeSeriesChart/util.js'

const AXIS_LEFT_KEY = 'y-left'
const AXIS_RIGHT_KEY = 'y-right'

export const useTimeSeriesFormatters = locale => useMemo(() => ({
  dateFormatter: getDateFormatter(locale),
  numberFormatter: getNumberFormatter(locale)
}), [locale])

/**
 * Align heterogeneous series on a shared timeline and aggregate metadata.
 *
 * @param {Array} series - Array of series objects with {id, label, axis, color, data, valueType}
 * @returns {{xValues: number[], alignedSeries: Array, axisKeys: Set<string>}}
 */
export const alignSeriesData = (series = []) => {
  const xValueSet = new Set()
  const normalized = []

  for (const input of series) {
    if (!input || !Array.isArray(input.data)) {
      continue
    }

    const axisKey = input.axis === 'right' ? AXIS_RIGHT_KEY : AXIS_LEFT_KEY
    const pointMap = new Map()

    for (const point of input.data) {
      if (!point || point.x === undefined || point.x === null) {
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

    normalized.push({
      id: input.id,
      label: input.label ?? input.id,
      color: input.color,
      axisKey,
      valueType: input.valueType,
      pointMap,
      original: input
    })
  }

  const xValues = [...xValueSet].sort((first, second) => first - second)

  if (xValues.length === 0 || normalized.length === 0) {
    return {
      xValues: [],
      alignedSeries: [],
      axisKeys: new Set()
    }
  }

  const alignedSeries = normalized.map(item => {
    const data = xValues.map(timestamp => item.pointMap.get(timestamp) ?? null)
    const hasNonNullValue = data.some(value => value !== null)

    return hasNonNullValue
      ? {
        id: item.id,
        label: item.label,
        color: item.color,
        axisKey: item.axisKey,
        valueType: item.valueType,
        data,
        original: item.original
      }
      : null
  }).filter(Boolean)

  return {
    xValues,
    alignedSeries,
    axisKeys: new Set(alignedSeries.map(item => item.axisKey))
  }
}

/**
 * Build Y-axis configurations for the provided axis keys.
 *
 * @param {Set<string>} axisKeys - Keys representing axes used by the series
 * @param {Intl.NumberFormat} numberFormatter - Number formatter instance for labels
 * @returns {Array} Y-axis configuration objects
 */
export const buildYAxisConfigs = (axisKeys, numberFormatter) => {
  if (!axisKeys || axisKeys.size === 0) {
    return [{
      id: AXIS_LEFT_KEY,
      position: 'left',
      scaleType: 'linear',
      valueFormatter: value => numberFormatter.format(value)
    }]
  }

  const axes = []

  if (axisKeys.has(AXIS_LEFT_KEY)) {
    axes.push({
      id: AXIS_LEFT_KEY,
      position: 'left',
      scaleType: 'linear',
      valueFormatter: value => numberFormatter.format(value)
    })
  }

  if (axisKeys.has(AXIS_RIGHT_KEY)) {
    axes.push({
      id: AXIS_RIGHT_KEY,
      position: 'right',
      scaleType: 'linear',
      valueFormatter: value => numberFormatter.format(value)
    })
  }

  return axes
}

/**
 * Create a default tooltip renderer shared across charts.
 *
 * @param {Intl.DateTimeFormat} dateFormatter - Formatter for X-axis values
 * @param {Intl.NumberFormat} numberFormatter - Number formatter for values
 * @returns {Function} Tooltip component for chart slots.axisContent
 */
export const createDefaultAxisTooltip = (dateFormatter, numberFormatter) => {
  const Tooltip = ({axisValue, series, dataIndex}) => {
    if (axisValue === undefined || axisValue === null || dataIndex === undefined || dataIndex === null) {
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
          ? item.valueFormatter(value, {dataIndex})
          : numberFormatter.format(value)

        if (formattedValue === null || formattedValue === undefined) {
          return null
        }

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

  Tooltip.displayName = 'TimeSeriesDefaultTooltip'
  return Tooltip
}
