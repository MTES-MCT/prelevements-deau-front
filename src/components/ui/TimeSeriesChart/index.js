/**
 * @file TimeSeriesChart Component
 * @description Advanced time series chart component with dual Y-axis support, thresholds,
 * conditional coloring, metadata annotations, and interactive tooltips.
 * Based on MUI X Charts (Community Edition).
 */

'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {
  ChartsReferenceLine,
  ChartsLegend,
  ChartsTooltip,
  ChartsAxis,
  ChartsGrid,
  ChartsAxisHighlight,
  LinePlot,
  BarPlot,
  MarkPlot
} from '@mui/x-charts'
import {ChartContainer} from '@mui/x-charts/ChartContainer'
import {useDrawingArea, useXScale, useYScale} from '@mui/x-charts/hooks'

import buildComposedSeries from './build-composed-series.js'
import {
  AXIS_LEFT_ID,
  AXIS_RIGHT_ID,
  DECIMATION_TARGET,
  MAX_POINTS_BEFORE_DECIMATION,
  X_AXIS_ID,
  axisFormatterFactory,
  buildAnnotations,
  buildSeriesModel,
  getNumberFormatter
} from './util.js'

import CompactAlert from '@/components/ui/CompactAlert/index.js'
import MetasList from '@/components/ui/MetasList/index.js'

const CHART_HEIGHT = 360

/**
 * @typedef {Object} DataPoint
 * @property {Date} x - Timestamp of the data point
 * @property {number|null} y - Value at this point (null for missing data)
 * @property {Object} [meta] - Optional metadata for this point
 * @property {string} [meta.comment] - Comment or note about this data point
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
 * @param {Object} params - Chart model parameters
 * @param {Series[]} params.series - Array of series to display
 * @param {string} params.locale - Locale for formatting (e.g., 'fr-FR', 'en-US')
 * @param {Object} params.theme - MUI theme object
 * @param {boolean} params.exposeAllMarks - Whether to expose all data point marks
 * @param {Object} params.options - Additional options including frequency
 * @returns {Object} Chart model with processed series, axes, and annotations
 */

const useChartModel = ({series, locale, theme, exposeAllMarks, options}) => useMemo(
  () => buildSeriesModel({
    series,
    locale,
    theme,
    exposeAllMarks,
    ...options
  }),
  [series, locale, theme, exposeAllMarks, options]
)

/**
 * Helper to collect parameters and alerts from series data
 * @param {Array} series - Array of series data
 * @param {number} dataIndex - Index of the data point
 * @param {Function} getPointMeta - Function to retrieve metadata
 * @param {Function} getSegmentOrigin - Function to retrieve segment origin
 * @param {Object} translations - Translation strings
 * @returns {Object} Object with parameters and alerts arrays
 */
const collectTooltipData = ({series, dataIndex, getPointMeta, getSegmentOrigin, translations}) => {
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
        content: translations.interpolatedPoint
      })
    }
  }

  return {parameters, alerts}
}

/**
 * Custom Tooltip Content Component
 * Displays rich information about data points on hover:
 * - Full datetime label (always includes date and time)
 * - Parameter values with color indicators
 * - Metadata (comments, alerts, synthetic points)
 * @param {Date|number|string} props.axisValue - The value on the x-axis
 * @param {number} props.dataIndex - Index of the data point
 * @param {Array} props.series - Array of series data
 * @param {Object} props.axis - Axis configuration
 * @param {Function} props.getPointMeta - Function to retrieve metadata for a point
 * @param {Function} props.getSegmentOrigin - Function to retrieve segment origin data
 * @param {Function} props.getXAxisDate - Function returning the true date for the tooltip label
 * @param {Object} props.translations - Translation strings
 * @param {string} props.locale - Locale string for date formatting
 * @returns {JSX.Element|null} Tooltip content or null if no data
 */
const AxisTooltipContent = ({axisValue, dataIndex, series, axis, getPointMeta, getSegmentOrigin, getXAxisDate, translations: t, locale}) => {
  // Tooltip ALWAYS shows full date and time, regardless of x-axis tick format
  // This ensures users can see the complete timestamp even when ticks show abbreviated formats
  const tooltipDateFormatter = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    return value => formatter.format(value instanceof Date ? value : new Date(value))
  }, [locale])

  // Resolve axis value before early return to respect Hooks rules
  const resolvedAxisValue = useMemo(() => {
    if (typeof getXAxisDate === 'function') {
      const value = getXAxisDate(axisValue, dataIndex)
      if (value) {
        return value
      }
    }

    return axisValue
  }, [axisValue, dataIndex, getXAxisDate])

  if (dataIndex === null || dataIndex === undefined) {
    return null
  }

  const forceDateFormatting = resolvedAxisValue instanceof Date
    || (typeof resolvedAxisValue === 'number' && Number.isFinite(resolvedAxisValue))
  const defaultFormatter = value => value?.toString?.() ?? ''
  const axisFormatter = forceDateFormatting
    ? () => tooltipDateFormatter(resolvedAxisValue)
    : (axis?.valueFormatter || defaultFormatter)

  // Collect all parameters (series values) and alerts
  const {parameters, alerts} = collectTooltipData({
    series,
    dataIndex,
    getPointMeta,
    getSegmentOrigin,
    translations: t
  })

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
        <Typography sx={{fontWeight: 'bold'}}>{axisFormatter(resolvedAxisValue ?? axisValue)}</Typography>
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

  /**
   * Choose a shape for the annotation marker based on metadata.
   * Comments or alerts use a square to differentiate from segment markers (circles).
   */
  const getPointShape = meta => (meta?.comment || meta?.alert ? 'square' : 'circle')

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
          // Since x-axis is a band scale using indices, we must use the index
          // and center the point in the band
          x = xScale(annotation.index)
          if (typeof xScale.bandwidth === 'function') {
            x += xScale.bandwidth() / 2
          }

          y = yScale(annotation.y)

          // For bar charts, offset the annotation to float above/below the bar
          if (annotation.seriesType === 'bar') {
            const offset = 10
            y += annotation.y >= 0 ? -offset : offset
          }
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
        const pointShape = getPointShape(annotation.originalPoint.meta)

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
            {pointShape === 'square' ? (
              <>
                <rect x={-6} y={-6} width={12} height={12} fill='white' stroke={annotation.color} strokeWidth={2} />
                <rect x={-3} y={-3} width={6} height={6} fill={pointFillColor} />
              </>
            ) : (
              <>
                <circle r={6} fill='white' stroke={annotation.color} strokeWidth={2} />
                <circle r={2.5} fill={pointFillColor} />
              </>
            )}
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
 * Default translation strings (French)
 * @constant
 */
const DEFAULT_TRANSLATIONS = {
  interpolatedPoint: 'Point interpolé',
  noDataAvailable: 'Aucune donnée disponible.',
  decimationWarning: 'Les données ont été décimées pour préserver les performances d\'affichage.',
  chartAriaLabel: 'Graphique séries temporelles'
}

/**
 * TimeSeriesChart Component
 *
 * Displays multiple time series on a single chart with support for:
 * - Mixed bar/line rendering where each series can define its own type
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
 *   translations={{
 *     interpolatedPoint: 'Interpolated point',
 *     noDataAvailable: 'No data available.',
 *     decimationWarning: 'Data has been decimated to preserve display performance.',
 *     chartAriaLabel: 'Time series chart'
 *   }}
 * />
 * ```
 *
 * @param {Object} props - Component props
 * @param {Series[]} props.series - Array of series to display. Each series must have id, label, axis, color, and data
 * @param {string} [props.locale='fr-FR'] - Locale for date/number formatting (e.g., 'fr-FR', 'en-US')
 * @param {Function} [props.onPointClick] - Callback when a data point with metadata is clicked: (seriesId, point) => void
 * @param {Object} [props.translations] - Translation strings for UI text
 * @param {string} [props.translations.interpolatedPoint='Point interpolé'] - Label for interpolated points
 * @param {string} [props.translations.noDataAvailable='Aucune donnée disponible.'] - Message when no data is available
 * @param {string} [props.translations.decimationWarning='Les données ont été décimées...'] - Warning message for decimated data
 * @param {string} [props.translations.chartAriaLabel='Graphique séries temporelles'] - ARIA label for the chart
 * @param {boolean} [props.enableThresholds=true] - Enable threshold processing (segmentation, threshold lines)
 * @param {boolean} [props.enableAnnotations=true] - Enable metadata annotations overlay
 * @param {boolean} [props.enableDecimation=true] - Enable automatic data decimation for large datasets
 * @param {number} [props.decimationTarget=DECIMATION_TARGET] - Target number of points after decimation
 * @param {number} [props.maxPointsBeforeDecimation=MAX_POINTS_BEFORE_DECIMATION] - Point count that triggers decimation warning
 *
 * @returns {JSX.Element} Rendered time series chart
 */
const TimeSeriesChart = ({
  series,
  locale,
  onPointClick,
  translations = DEFAULT_TRANSLATIONS,
  enableThresholds = true,
  enableAnnotations = true,
  enableDecimation = true,
  decimationTarget = DECIMATION_TARGET,
  maxPointsBeforeDecimation = MAX_POINTS_BEFORE_DECIMATION,
  frequency = null,
  timelineRange = null
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...translations}
  const theme = useTheme()
  const numberFormatter = useMemo(() => getNumberFormatter(locale), [locale])
  const formatBarValue = useCallback(value => {
    if (value === null || Number.isNaN(value)) {
      return null
    }

    return numberFormatter.format(value)
  }, [numberFormatter])
  const [visibility, setVisibility] = useState(() => getInitialVisibility(series))
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(null)

  useEffect(() => {
    setVisibility(previous => ({
      ...getInitialVisibility(series),
      ...previous
    }))
  }, [series])

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }

    const updateWidth = () => setContainerWidth(node.clientWidth || 0)
    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
      }

      return undefined
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const chartOptions = useMemo(() => ({
    enableThresholds,
    enableDecimation,
    decimationTarget,
    maxPointsBeforeDecimation,
    timelineFrequency: frequency,
    timelineRange
  }), [enableThresholds, enableDecimation, decimationTarget, maxPointsBeforeDecimation, frequency, timelineRange])

  const chartModel = useChartModel({
    series,
    locale,
    theme,
    exposeAllMarks: Boolean(onPointClick),
    options: chartOptions
  })

  const xAxisDateFormatter = useMemo(
    () => axisFormatterFactory(locale, chartModel.xAxisDates),
    [chartModel.xAxisDates, locale]
  )
  const xAxisBand = useMemo(() => [{
    id: X_AXIS_ID,
    scaleType: 'band',
    data: chartModel.xAxisDates.map((_date, index) => index), // Use indices for band scale
    valueFormatter(value) {
      // Value is index, get corresponding date
      const date = chartModel.xAxisDates[value]
      return date ? xAxisDateFormatter(date) : ''
    },
    tickLabelStyle: {fontSize: 12}
  }], [chartModel.xAxisDates, xAxisDateFormatter])

  const yAxis = useMemo(() => chartModel.yAxis, [chartModel.yAxis])
  const inputSeriesTypeById = useMemo(
    () => new Map(series.map(item => [item.id, item.type === 'bar' ? 'bar' : 'line'])),
    [series]
  )
  const resolveSeriesType = useCallback(
    originalId => inputSeriesTypeById.get(originalId) ?? 'line',
    [inputSeriesTypeById]
  )

  const getTooltipXAxisDate = useCallback((axisValue, dataIndex) => {
    const hasValidIndex = typeof dataIndex === 'number'
      && dataIndex >= 0
      && dataIndex < chartModel.xAxisDates.length
    if (hasValidIndex) {
      return chartModel.xAxisDates[dataIndex]
    }

    if (axisValue instanceof Date) {
      return axisValue
    }

    if (Number.isInteger(axisValue)
        && axisValue >= 0
        && axisValue < chartModel.xAxisDates.length) {
      return chartModel.xAxisDates[axisValue]
    }

    if (typeof axisValue === 'number' && Number.isFinite(axisValue)) {
      return new Date(axisValue)
    }

    const numericValue = Number(axisValue)
    if (Number.isInteger(numericValue)
        && numericValue >= 0
        && numericValue < chartModel.xAxisDates.length) {
      return chartModel.xAxisDates[numericValue]
    }

    return null
  }, [chartModel.xAxisDates])

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

  const resolveSeriesColor = useCallback(
    (originalId, baseColor) => (visibility[originalId] === false ? theme.palette.grey[400] : baseColor),
    [visibility, theme.palette.grey]
  )

  const {composedSeries} = useMemo(() => buildComposedSeries({
    stubSeries: chartModel.stubSeries,
    segmentSeries: filteredSegments,
    dynamicThresholdSeries: filteredThresholds,
    xAxisLength: chartModel.xAxisDates.length,
    resolveSeriesType,
    resolveSeriesColor,
    formatBarValue
  }), [
    chartModel.stubSeries,
    filteredSegments,
    filteredThresholds,
    chartModel.xAxisDates.length,
    resolveSeriesType,
    resolveSeriesColor,
    formatBarValue
  ])

  const annotations = useMemo(() => {
    if (!enableAnnotations) {
      return []
    }

    const allAnnotations = buildAnnotations({
      pointBySeries: chartModel.pointBySeries,
      metaBySeries: chartModel.metaBySeries,
      visibility,
      theme,
      seriesTypes: inputSeriesTypeById
    })

    // Filter annotations to only keep those whose axis is configured
    // This prevents errors when rendering annotations for non-existent axes
    const configuredAxisIds = new Set(yAxis.map(axis => axis.id))
    return allAnnotations.filter(annotation => configuredAxisIds.has(annotation.axisId))
  }, [chartModel.pointBySeries, chartModel.metaBySeries, visibility, theme, yAxis, enableAnnotations, inputSeriesTypeById])

  const dashedStyles = useMemo(() => {
    const styles = {}
    for (const threshold of chartModel.dynamicThresholdSeries) {
      styles[`& .MuiLineElement-series-${threshold.id}`] = {strokeDasharray: '4 4'}
    }

    return styles
  }, [chartModel.dynamicThresholdSeries])

  const leftAxisId = useMemo(() => {
    const axis = yAxis.find(item => item.position === 'left' && item.hasData)
    return axis?.id ?? null
  }, [yAxis])

  const rightAxisId = useMemo(() => {
    const axis = yAxis.find(item => item.position === 'right' && item.hasData)
    return axis?.id ?? null
  }, [yAxis])

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
      <div className='p-6 border rounded-md bg-gray-50 text-gray-700 text-sm'>{t.noDataAvailable}</div>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <div ref={containerRef} className='w-full'>
        {containerWidth ? (
          <div role='figure' aria-label={t.chartAriaLabel}>
            <ChartContainer
              width={containerWidth}
              height={CHART_HEIGHT}
              series={composedSeries}
              xAxis={xAxisBand}
              yAxis={yAxis}
              margin={{
                top: 48, right: 80, bottom: 36, left: 80
              }}
              sx={{
                ...dashedStyles
              }}
            >
              <ChartsGrid horizontal vertical />
              <ChartsAxis
                leftAxis={leftAxisId ?? null}
                rightAxis={rightAxisId ?? null}
              />
              <ChartsAxisHighlight x='line' y='line' />
              <BarPlot />
              <LinePlot />
              <MarkPlot
                slotProps={{
                  mark: {
                    shape: 'circle'
                  }
                }}
                onItemClick={handleMarkClick}
              />
              <ChartsLegend
                direction='row'
                position={{vertical: 'top', horizontal: 'middle'}}
                onItemClick={handleLegendClick}
              />
              <ChartsTooltip
                trigger='axis'
                slots={{
                  axisContent: props => (
                    <AxisTooltipContent
                      {...props}
                      getPointMeta={getPointMeta}
                      getSegmentOrigin={getSegmentOrigin}
                      getXAxisDate={getTooltipXAxisDate}
                      translations={t}
                      locale={locale}
                    />
                  )
                }}
              />
              {chartModel.staticThresholds.map(threshold => (
                <ChartsReferenceLine
                  key={`${threshold.axisId}-${threshold.value}`}
                  y={threshold.value}
                  yAxisId={threshold.axisId}
                  lineStyle={{stroke: threshold.color, strokeDasharray: '4 4'}}
                />
              ))}
              {annotations.length > 0 && <ChartAnnotations annotations={annotations} onPointClick={onPointClick} />}
            </ChartContainer>
          </div>
        ) : (
          <Box sx={{height: CHART_HEIGHT}} />
        )}
      </div>

      {chartModel.didDecimate && (
        <div className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 gap-2 inline-flex items-center'>
          <span aria-hidden className={fr.cx('fr-icon-warning-line')} />
          {t.decimationWarning}
        </div>
      )}
    </div>
  )
}

export {DEFAULT_TRANSLATIONS}
export default TimeSeriesChart
