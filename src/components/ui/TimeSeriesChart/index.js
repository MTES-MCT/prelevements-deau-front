/**
 * @file TimeSeriesChart Component
 * @description Advanced time series chart component with dual Y-axis support, thresholds,
 * conditional coloring, metadata annotations, and interactive tooltips.
 * Based on MUI X Charts (Community Edition).
 */

'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Box, Typography} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {LineChart, ChartsReferenceLine} from '@mui/x-charts'
import {useDrawingArea, useXScale, useYScale} from '@mui/x-charts/hooks'

import {
  AXIS_LEFT_ID,
  AXIS_RIGHT_ID,
  X_AXIS_ID,
  axisFormatterFactory,
  buildAnnotations,
  buildSeriesModel
} from './util.js'

import CompactAlert from '@/components/ui/CompactAlert/index.js'
import MetasList from '@/components/ui/MetasList/index.js'

/**
 * @typedef {Object} DataPoint
 * @property {Date} x - Timestamp of the data point
 * @property {number|null} y - Value at this point (null for missing data)
 * @property {Object} [meta] - Optional metadata for this point
 * @property {string} [meta.comment] - Comment or note about this data point
 * @property {string[]} [meta.tags] - Tags associated with this point
 * @property {string} [meta.alert] - Alert message for this point if an alert is triggered
 */

/**
 * @typedef {Object} ThresholdPoint
 * @property {Date} x - Timestamp for this threshold value
 * @property {number} y - Threshold value at this time
 */

/**
 * @typedef {Object} Series
 * @property {string} id - Unique identifier for the series
 * @property {string} label - Display label for the series
 * @property {'left'|'right'} axis - Which Y-axis to use ('left' or 'right')
 * @property {string} color - Color for the line (hex or CSS color)
 * @property {DataPoint[]} data - Array of data points
 * @property {number|ThresholdPoint[]} [threshold] - Static threshold value or dynamic threshold array
 */

/**
 * Custom hook to build and memoize the chart model
 * @param {Series[]} series - Array of series to display
 * @param {string} locale - Locale for formatting (e.g., 'fr-FR', 'en-US')
 * @param {Object} theme - MUI theme object
 * @param {boolean} exposeAllMarks - Whether to expose all data point marks
 * @returns {Object} Chart model with processed series, axes, and annotations
 */

const useChartModel = (series, locale, theme, exposeAllMarks) => useMemo(
  () => buildSeriesModel({
    series, locale, theme, exposeAllMarks
  }),
  [series, locale, theme, exposeAllMarks]
)

/**
 * Custom tooltip content component for the chart
 * Displays series values, metadata, alerts, and synthetic point indicators
 * Styled to match the PeriodTooltip component for UI consistency
 * @param {Object} props - Component props
 * @param {Date} props.axisValue - Current X-axis value (timestamp)
 * @param {number} props.dataIndex - Index of the current data point
 * @param {Array} props.series - Array of series with their data
 * @param {Object} props.axis - Axis configuration
 * @param {Function} props.getPointMeta - Function to retrieve metadata for a point
 * @param {Function} props.getSegmentOrigin - Function to retrieve segment origin data
 * @returns {JSX.Element|null} Tooltip content or null if no data
 */
const AxisTooltipContent = ({axisValue, dataIndex, series, axis, getPointMeta, getSegmentOrigin}) => {
  if (dataIndex === null || dataIndex === undefined) {
    return null
  }

  const axisFormatter = axis.valueFormatter ?? (value => value?.toString?.() ?? '')

  // Collect all parameters (series values) for MetasList
  const parameters = []
  const alerts = []

  for (const item of series) {
    const baseId = item.originalId ?? item.id
    const originalLabel = item.originalLabel ?? item.label
    const formattedValue = item.valueFormatter?.(item.data?.[dataIndex] ?? null, {dataIndex})

    if (formattedValue === null || formattedValue === undefined) {
      continue
    }

    const meta = getPointMeta(baseId, dataIndex)
    const origin = getSegmentOrigin(baseId, dataIndex)
    const color = item.getColor?.(dataIndex) ?? item.color

    // Create parameter entry with colored dot icon
    const ColorDot = properties => (
      <span
        {...properties}
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color
        }}
      />
    )
    ColorDot.displayName = originalLabel

    parameters.push({
      icon: ColorDot,
      content: `${originalLabel}: ${formattedValue}`
    })

    // Add meta information if present
    if (meta) {
      if (meta.tags?.length > 0) {
        for (const tag of meta.tags) {
          parameters.push({
            content: tag
          })
        }
      }

      if (meta.comment) {
        alerts.push({
          alertLabel: meta.comment,
          alertType: 'info'
        })
      }

      if (meta.alert) {
        alerts.push({
          alertLabel: meta.alert,
          alertType: 'error'
        })
      }
    }

    // Add synthetic point indicator
    if (origin?.synthetic) {
      parameters.push({
        content: 'Point interpolé'
      })
    }
  }

  return (
    <Box
      sx={{
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: 'white',
        borderRadius: 1,
        minWidth: 220,
        maxWidth: 320
      }}
    >
      {axisValue !== undefined && (
        <Typography sx={{fontWeight: 'bold'}}>{axisFormatter(axisValue)}</Typography>
      )}
      <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
        {parameters.length > 0 && <MetasList metas={parameters} />}
        {alerts.length > 0 && (
          <Box>
            {alerts.map(alert => (
              <CompactAlert
                key={alert.alertLabel}
                label={alert.alertLabel}
                alertType={alert.alertType}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

/**
 * SVG overlay component to render metadata annotations on the chart
 * Displays interactive circles for data points with metadata
 * Annotations are pre-filtered to only include those for configured axes
 * Point colors indicate metadata type:
 * - Red for alerts
 * - Blue for comments
 * - Gray for other metadata
 * @param {Object} props - Component props
 * @param {Array} props.annotations - Array of annotation objects with position and metadata
 * @param {Function} [props.onPointClick] - Callback when an annotation is clicked
 * @returns {JSX.Element|null} SVG group with annotations or null if no annotations
 */
const ChartAnnotations = ({annotations, onPointClick}) => {
  const drawingArea = useDrawingArea()
  const xScale = useXScale(X_AXIS_ID)

  // Always call hooks unconditionally (React rules requirement)
  // Since annotations are pre-filtered, we know these axes exist
  const yLeftScale = useYScale(AXIS_LEFT_ID)
  const yRightScale = useYScale(AXIS_RIGHT_ID)

  const yScaleByAxis = {
    [AXIS_LEFT_ID]: yLeftScale,
    [AXIS_RIGHT_ID]: yRightScale
  }

  if (annotations.length === 0 || !drawingArea || !xScale) {
    return null
  }

  /**
   * Determines the fill color of the annotation point based on metadata
   * @param {Object} meta - Metadata object
   * @returns {string} Color code for the point fill
   */
  const getPointFillColor = meta => {
    if (meta?.alert) {
      return '#dc2626' // Red for alerts
    }

    if (meta?.comment) {
      return '#2563eb' // Blue for comments
    }

    return '#6b7280' // Gray for other metadata
  }

  return (
    <g>
      {annotations.map(annotation => {
        const yScale = yScaleByAxis[annotation.axisId]
        // Check if axis scale exists and is a function
        // useYScale returns undefined if the axis is not configured
        if (!yScale || typeof yScale !== 'function') {
          return null
        }

        let x
        let y

        // Safely call the scale functions with try-catch for added safety
        try {
          x = xScale(annotation.x)
          y = yScale(annotation.y)
        } catch {
          return null
        }

        if (!Number.isFinite(x) || !Number.isFinite(y) || !drawingArea.isPointInside({x, y})) {
          return null
        }

        const handleActivate = () => {
          if (onPointClick) {
            onPointClick(annotation.seriesId, {
              x: annotation.originalPoint.x,
              y: annotation.originalPoint.y,
              meta: annotation.originalPoint.meta
            })
          }
        }

        const pointFillColor = getPointFillColor(annotation.originalPoint.meta)

        return (
          <g
            key={`${annotation.seriesId}-${annotation.index}`}
            className={onPointClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' : undefined}
            role={onPointClick ? 'button' : 'presentation'}
            tabIndex={onPointClick ? 0 : undefined}
            transform={`translate(${x}, ${y})`}
            onClick={handleActivate}
            onKeyDown={event => {
              if (!onPointClick) {
                return
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleActivate()
              }
            }}
          >
            <circle r={6} fill='white' stroke={annotation.color} strokeWidth={2} />
            <circle r={2.5} fill={pointFillColor} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * Helper function to create initial visibility state for all series
 * @param {Series[]} series - Array of series
 * @returns {Object} Object mapping series IDs to visibility state (all true by default)
 */
const getInitialVisibility = series => Object.fromEntries(series.map(item => [item.id, true]))

/**
 * TimeSeriesChart Component
 *
 * Displays multiple time series on a single chart with support for:
 * - Dual Y-axes (left and right) for series with different units
 * - Static and dynamic thresholds with conditional coloring
 * - Metadata annotations (comments, tags, alerts)
 * - Interactive tooltips with comprehensive information
 * - Legend toggle to show/hide series
 * - Synthetic points for threshold crossings
 *
 * @component
 * @example
 * ```jsx
 * <TimeSeriesChart
 *   series={[
 *     {
 *       id: 'temperature',
 *       label: 'Température (°C)',
 *       axis: 'left',
 *       color: '#2563eb',
 *       data: [
 *         { x: new Date('2024-01-01'), y: 18.5 },
 *         { x: new Date('2024-01-02'), y: 19.2, meta: { alert: true } }
 *       ],
 *       threshold: 20
 *     },
 *     {
 *       id: 'humidity',
 *       label: 'Humidité (%)',
 *       axis: 'right',
 *       color: '#16a34a',
 *       data: [
 *         { x: new Date('2024-01-01'), y: 65 },
 *         { x: new Date('2024-01-02'), y: 70 }
 *       ],
 *       threshold: [
 *         { x: new Date('2024-01-01'), y: 60 },
 *         { x: new Date('2024-01-02'), y: 68 }
 *       ]
 *     }
 *   ]}
 *   locale="fr-FR"
 *   onPointClick={(seriesId, point) => {
 *     console.log(`Clicked ${seriesId}:`, point)
 *   }}
 * />
 * ```
 *
 * @param {Object} props - Component props
 * @param {Series[]} props.series - Array of series to display. Each series must have id, label, axis, color, and data
 * @param {string} [props.locale='fr-FR'] - Locale for date/number formatting (e.g., 'fr-FR', 'en-US')
 * @param {Function} [props.onPointClick] - Callback when a data point with metadata is clicked: (seriesId, point) => void
 *
 * @returns {JSX.Element} Rendered time series chart
 */
const TimeSeriesChart = ({series, locale, onPointClick}) => {
  const theme = useTheme()
  const [visibility, setVisibility] = useState(() => getInitialVisibility(series))

  useEffect(() => {
    setVisibility(previous => ({
      ...getInitialVisibility(series),
      ...previous
    }))
  }, [series])

  const chartModel = useChartModel(series, locale, theme, Boolean(onPointClick))

  const xAxis = useMemo(() => [{
    id: X_AXIS_ID,
    scaleType: 'time',
    data: chartModel.xAxisDates,
    valueFormatter: axisFormatterFactory(locale),
    tickLabelStyle: {fontSize: 12}
  }], [chartModel.xAxisDates, locale])

  const yAxis = useMemo(() => chartModel.yAxis, [chartModel.yAxis])

  const handleLegendClick = useCallback((event, item) => {
    event.preventDefault()
    setVisibility(previous => ({
      ...previous,
      [item.seriesId]: !previous[item.seriesId]
    }))
  }, [])

  const filteredSegments = useMemo(
    () => chartModel.segmentSeries.filter(segment => visibility[segment.originalId] !== false),
    [chartModel.segmentSeries, visibility]
  )

  const filteredThresholds = useMemo(
    () => chartModel.dynamicThresholdSeries.filter(threshold => visibility[threshold.originalId] !== false),
    [chartModel.dynamicThresholdSeries, visibility]
  )

  const composedSeries = useMemo(() => {
    const legendSeries = chartModel.stubSeries.map(stub => ({
      ...stub,
      color: visibility[stub.originalId] === false ? theme.palette.grey[400] : stub.color
    }))
    return [...legendSeries, ...filteredSegments, ...filteredThresholds]
  }, [chartModel.stubSeries, filteredSegments, filteredThresholds, visibility, theme.palette.grey])

  const annotations = useMemo(() => {
    const allAnnotations = buildAnnotations({
      pointBySeries: chartModel.pointBySeries,
      visibility,
      theme
    })

    // Filter annotations to only keep those whose axis is configured
    // This prevents errors when rendering annotations for non-existent axes
    const configuredAxisIds = new Set(yAxis.map(axis => axis.id))
    return allAnnotations.filter(annotation => configuredAxisIds.has(annotation.axisId))
  }, [chartModel.pointBySeries, visibility, theme, yAxis])

  const dashedStyles = useMemo(() => {
    const styles = {}
    for (const threshold of chartModel.dynamicThresholdSeries) {
      styles[`& .MuiLineElement-series-${threshold.id}`] = {strokeDasharray: '4 4'}
    }

    return styles
  }, [chartModel.dynamicThresholdSeries])

  const getPointMeta = useCallback((seriesId, index) => chartModel.metaBySeries.get(seriesId)?.[index] ?? null, [chartModel.metaBySeries])

  const getSegmentOrigin = useCallback((seriesId, index) => chartModel.pointBySeries.get(seriesId)?.[index] ?? null, [chartModel.pointBySeries])

  const handleMarkClick = useCallback((event, item) => {
    if (!onPointClick) {
      return
    }

    const originalId = chartModel.segmentToOriginal.get(item.seriesId) ?? item.seriesId
    const point = chartModel.pointBySeries.get(originalId)?.[item.dataIndex]
    if (!point || point.synthetic) {
      return
    }

    onPointClick(originalId, {
      x: point.x,
      y: point.y,
      meta: point.meta
    })
  }, [chartModel.pointBySeries, chartModel.segmentToOriginal, onPointClick])

  if (chartModel.xAxisDates.length === 0) {
    return (
      <div className='p-6 border rounded-md bg-gray-50 text-gray-700 text-sm'>Aucune donnée disponible.</div>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {chartModel.didDecimate && (
        <div className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2'>
          Les données ont été décimées pour préserver les performances d&apos;affichage.
        </div>
      )}
      <div role='figure' aria-label='Graphique séries temporelles'>
        <LineChart
          height={360}
          series={composedSeries}
          xAxis={xAxis}
          yAxis={yAxis}
          leftAxis={yAxis[0]?.hasData ? yAxis[0]?.id : null}
          rightAxis={yAxis[1]?.hasData ? yAxis[1]?.id : null}
          margin={{
            top: 48, right: 80, bottom: 36, left: 80
          }}
          grid={{horizontal: true, vertical: true}}
          slotProps={{
            legend: {
              onItemClick: handleLegendClick,
              direction: 'row',
              position: {vertical: 'top', horizontal: 'middle'}
            },
            mark: {
              shape: 'circle'
            }
          }}
          sx={{
            ...dashedStyles
          }}
          slots={{
            axisContent: props => (
              <AxisTooltipContent
                {...props}
                getPointMeta={getPointMeta}
                getSegmentOrigin={getSegmentOrigin}
              />
            )
          }}
          onMarkClick={handleMarkClick}
        >
          {chartModel.staticThresholds.map(threshold => (
            <ChartsReferenceLine
              key={`${threshold.axisId}-${threshold.value}`}
              y={threshold.value}
              yAxisId={threshold.axisId}
              lineStyle={{stroke: threshold.color, strokeDasharray: '4 4'}}
            />
          ))}
          {annotations.length > 0 && <ChartAnnotations annotations={annotations} onPointClick={onPointClick} />}
        </LineChart>
      </div>
    </div>
  )
}

export default TimeSeriesChart
