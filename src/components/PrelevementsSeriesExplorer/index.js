/**
 * PrelevementsSeriesExplorer Component
 *
 * Composite component that orchestrates period selection, calendar display,
 * parameter selection, and time-series visualization with range refinement.
 *
 * Takes series metadata as input and loads values on-demand via API.
 *
 * @component
 * @example
 * ```jsx
 *
 * <PrelevementsSeriesExplorer
 *   series={seriesList}
 *   getSeriesValues={getSeriesValues}
 *   defaultPeriods={[{type: 'year', value: 2024}]}
 *   onPeriodChange={(periods) => console.log(periods)}
 *   onParameterChange={(params) => console.log(params)}
 * />
 * ```
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.series - Array of series metadata
 * @param {string} props.series[]._id - Series unique identifier
 * @param {string} props.series[].parameter - Parameter name
 * @param {string} props.series[].unit - Unit of measurement
 * @param {string} props.series[].frequency - Sampling frequency
 * @param {string} props.series[].valueType - Type of value (mean, max, cumulative, etc.)
 * @param {string} props.series[].minDate - Earliest date with data (YYYY-MM-DD)
 * @param {string} props.series[].maxDate - Latest date with data (YYYY-MM-DD)
 * @param {boolean} props.series[].hasSubDaily - Whether series has sub-daily data
 * @param {number} props.series[].numberOfValues - Total number of values
 * @param {Function} props.getSeriesValues - Function to fetch series values
 *   Signature: async (seriesId: string, {start: string, end: string}) => Promise<{series: Object, values: Array}>
 *   Returns: {series: {...}, values: [{date, value, remark?}, ...]}
 * @param {Array<Object>} [props.defaultPeriods=[]] - Initial selected periods
 * @param {Object} [props.selectablePeriods] - Available periods for selection
 * @param {string} [props.defaultInitialViewType='years'] - Initial view type ('years' or 'months')
 * @param {Function} [props.onPeriodChange] - Callback when period selection changes
 * @param {Function} [props.onParameterChange] - Callback when parameter selection changes
 * @param {Object} [props.translations] - Custom UI text translations
 * @param {boolean} [props.showPeriodSelector=true] - Show/hide period selector
 * @param {boolean} [props.showCalendar=true] - Show/hide calendar grid
 * @param {boolean} [props.showChart=true] - Show/hide time series chart
 * @param {boolean} [props.showRangeSlider=true] - Show/hide range refinement slider
 * @param {string} [props.locale='fr-FR'] - Locale for date/number formatting
 * @param {Object} [props.timeSeriesChartProps] - Additional props passed through to `TimeSeriesChart`
 * @param {Array<{color: string, label: string}>} [props.legendLabels] - Custom legend labels for calendar status colors
 */

'use client'

import {useMemo, useState, useCallback} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'

import ChartWithRangeSlider from './chart-with-range-slider.js'
import {DEFAULT_TRANSLATIONS} from './constants/parameters.js'
import {formatPeriodLabel, getViewTypeLabel} from './formatters.js'
import LoadingState from './loading-state.js'
import ParameterComments from './parameter-comments.js'
import ParameterSelector from './parameter-selector.js'
import {useChartSeries} from './use-chart-series.js'
import {useLoadSeriesValues} from './use-load-series-values.js'
import {
  useParameterMetadata,
  useParameterSelection
} from './use-parameter-selection.js'
import {useTimeline} from './use-timeline.js'
import {
  buildCalendarData,
  calculateSelectablePeriodsFromSeries,
  extractDefaultPeriodsFromSeries,
  periodsToDateRange
} from './utils/index.js'

import CalendarGrid from '@/components/ui/CalendarGrid/index.js'
import PeriodSelectorHeader from '@/components/ui/PeriodSelectorHeader/index.js'

/**
 * Hook to compute or use provided selectable periods
 */
function useSelectablePeriods(seriesList, providedSelectablePeriods) {
  return useMemo(
    () => providedSelectablePeriods ?? calculateSelectablePeriodsFromSeries(seriesList),
    [seriesList, providedSelectablePeriods]
  )
}

/**
 * Main PrelevementsSeriesExplorer Component
 */
const PrelevementsSeriesExplorer = ({
  series: seriesList,
  getSeriesValues,
  defaultPeriods,
  selectablePeriods: providedSelectablePeriods,
  defaultInitialViewType = 'years',
  onPeriodChange,
  onParameterChange,
  translations: customTranslations,
  showPeriodSelector = true,
  showCalendar = true,
  showChart = true,
  showRangeSlider = true,
  locale = 'fr-FR',
  timeSeriesChartProps,
  legendLabels
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...customTranslations}
  // Extract metadata from series
  const {
    parameters,
    parameterMap
  } = useParameterMetadata(seriesList)

  // Calculate or use provided selectable periods
  const selectablePeriods = useSelectablePeriods(seriesList, providedSelectablePeriods)

  // Extract default periods from series if not provided
  const initialPeriods = useMemo(() => {
    if (defaultPeriods && defaultPeriods.length > 0) {
      return defaultPeriods
    }

    return extractDefaultPeriodsFromSeries(seriesList)
  }, [defaultPeriods, seriesList])

  // Manage period selection state
  const [selectedPeriods, setSelectedPeriods] = useState(initialPeriods)

  // Manage parameter selection with validation
  const {
    selectedParams,
    parameterOptions,
    handleParameterChange
  } = useParameterSelection(parameters, parameterMap, onParameterChange)

  // Calculate date range from periods
  const dateRange = useMemo(() => periodsToDateRange(selectedPeriods), [selectedPeriods])

  // Load series values via API
  const {
    isLoadingValues,
    loadError,
    dailyValues,
    timelineSamples
  } = useLoadSeriesValues({
    seriesList,
    selectedPeriods,
    selectedParams,
    dateRange,
    getSeriesValues
  })

  // Handle period selection changes
  const handlePeriodChange = useCallback(periods => {
    setSelectedPeriods(periods)
    onPeriodChange?.(periods)
  }, [onPeriodChange])

  // Manage timeline and range slider
  const {
    allDates,
    rangeIndices,
    visibleSamples,
    sliderMarks,
    handleRangeChange,
    handleCalendarDayClick
  } = useTimeline(timelineSamples, showRangeSlider, dateRange)

  // Prepare chart series from loaded values
  const chartSeries = useChartSeries({
    showChart,
    timelineSamples,
    visibleSamples,
    selectedParams,
    parameterMap
  })

  // Build calendar data from loaded values
  const calendarData = useMemo(() => {
    if (!showCalendar || !dailyValues || dailyValues.length === 0) {
      return []
    }

    // Function buildCalendarData will determine colors based on value presence
    return buildCalendarData(dailyValues)
  }, [showCalendar, dailyValues])

  // Format labels for display
  const periodLabel = useMemo(
    () => formatPeriodLabel(selectedPeriods, t.periodLabel),
    [selectedPeriods, t.periodLabel]
  )
  const viewTypeLabel = useMemo(
    () => getViewTypeLabel(selectedPeriods),
    [selectedPeriods]
  )

  // Calculate current view type based on selected periods
  const currentViewType = useMemo(() => {
    if (!selectedPeriods || selectedPeriods.length === 0) {
      return defaultInitialViewType
    }

    // Check if there are multiple years or mixed types
    const years = new Set()
    for (const period of selectedPeriods) {
      if (period.type === 'year') {
        years.add(period.value)
      } else if (period.type === 'month') {
        years.add(period.year)
      }
    }

    // Multiple years → years view
    if (years.size > 1) {
      return 'years'
    }

    // Check if we have year-type periods
    const hasYearType = selectedPeriods.some(p => p.type === 'year')
    return hasYearType ? 'years' : 'months'
  }, [selectedPeriods, defaultInitialViewType])

  // No series case
  if (seriesList.length === 0) {
    return (
      <Box className='flex flex-col gap-4'>
        <Alert severity='info' description='Aucune série disponible' />
      </Box>
    )
  }

  return (
    <Box className='flex flex-col gap-6'>
      {/* Period Selector */}
      {showPeriodSelector && (
        <PeriodSelectorHeader
          periodLabel={periodLabel}
          viewTypeLabel={viewTypeLabel}
          defaultInitialViewType={defaultInitialViewType}
          currentViewType={currentViewType}
          defaultSelectedPeriods={selectedPeriods}
          selectablePeriods={selectablePeriods}
          onSelectionChange={handlePeriodChange}
        />
      )}

      {/* Calendar Grid */}
      {showCalendar && calendarData.length > 0 && (
        <Box>
          <CalendarGrid
            calendars={calendarData}
            legendLabels={legendLabels}
            onClick={handleCalendarDayClick}
          />
        </Box>
      )}

      {/* Parameter Selector */}
      <Box sx={{display: 'inline-block', maxWidth: 480}}>
        <ParameterSelector
          label={t.parameterLabel}
          hint={t.parameterHint}
          placeholder={t.parameterPlaceholder}
          value={selectedParams}
          options={parameterOptions}
          onChange={handleParameterChange}
        />
      </Box>

      {/* Parameter Comments */}
      <ParameterComments
        selectedParams={selectedParams}
        parameterMap={parameterMap}
      />

      {/* Loading state */}
      {showChart && isLoadingValues && (
        <LoadingState message={t.loadingData} />
      )}

      {/* Error state */}
      {showChart && loadError && (
        <Alert
          severity='error'
          title={t.loadError}
          description={loadError}
        />
      )}

      {/* Time Series Chart with Range Slider */}
      {showChart && !isLoadingValues && !loadError && selectedParams.length > 0 && (
        <ChartWithRangeSlider
          allDates={allDates}
          locale={locale}
          rangeIndices={rangeIndices}
          rangeLabel={t.rangeLabel}
          series={chartSeries.series}
          frequency={chartSeries.smallestFrequency}
          showRangeSlider={showRangeSlider}
          sliderMarks={sliderMarks}
          timeSeriesChartProps={timeSeriesChartProps}
          onRangeChange={handleRangeChange}
        />
      )}

      {/* No parameters selected message */}
      {showChart && !isLoadingValues && selectedParams.length === 0 && (
        <Alert
          severity='info'
          description={t.selectParametersMessage}
        />
      )}
    </Box>
  )
}

export default PrelevementsSeriesExplorer
