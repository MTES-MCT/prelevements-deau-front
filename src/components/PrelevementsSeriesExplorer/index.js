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
 * // Define API fetch function
 * async function getSeriesValues(seriesId, {start, end}) {
 *   const response = await fetch(
 *     `/api/series/${seriesId}/values?start=${start}&end=${end}&withPoint=1`
 *   )
 *   if (!response.ok) {
 *     throw new Error('Failed to load series values')
 *   }
 *   return response.json() // Returns { series: {...}, values: [...] }
 * }
 *
 * <PrelevementsSeriesExplorer
 *   series={[
 *     {
 *       _id: '507f1f77bcf86cd799439011',
 *       parameter: 'debit',
 *       unit: 'm³/h',
 *       frequency: '1 hour',
 *       hasSubDaily: true,
 *       minDate: '2024-01-01',
 *       maxDate: '2024-12-31',
 *       numberOfValues: 8760,
 *       pointPrelevement: '507f1f77bcf86cd799439012',
 *       pointInfo: {
 *         id_point: 123,
 *         nom: 'Point A'
 *       }
 *     }
 *   ]}
 *   getSeriesValues={getSeriesValues}
 *   defaultPeriods={[{type: 'year', value: 2024}]}
 *   onPeriodChange={(periods) => console.log(periods)}
 *   onParameterChange={(params) => console.log(params)}
 *   showPeriodSelector={false}
 * />
 * ```
 */

'use client'

import {useMemo, useState, useCallback} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'

import ChartWithRangeSlider from './chart-with-range-slider.js'
import {DEFAULT_TRANSLATIONS} from './constants.js'
import {formatPeriodLabel, getViewTypeLabel} from './formatters.js'
import LoadingState from './loading-state.js'
import ParameterSelector from './parameter-selector.js'
import {useCalendarData} from './use-calendar-data.js'
import {useChartSeries} from './use-chart-series.js'
import {useLoadSeriesValues} from './use-load-series-values.js'
import {
  useParameterMetadata,
  useParameterSelection
} from './use-parameter-selection.js'
import {useTimeline} from './use-timeline.js'
import {
  calculateSelectablePeriodsFromSeries,
  periodsToDateRange
} from './util.js'

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
  defaultPeriods = [],
  selectablePeriods: providedSelectablePeriods,
  defaultInitialViewType = 'years',
  onPeriodChange,
  onParameterChange,
  translations: customTranslations,
  showPeriodSelector = true,
  showCalendar = true,
  showChart = true,
  showRangeSlider = true,
  locale = 'fr-FR'
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...customTranslations}

  // Extract metadata from series
  const {
    parameters,
    parameterOptions,
    parameterMap
  } = useParameterMetadata(seriesList)

  // Calculate or use provided selectable periods
  const selectablePeriods = useSelectablePeriods(seriesList, providedSelectablePeriods)

  // Manage period selection state
  const [selectedPeriods, setSelectedPeriods] = useState(defaultPeriods)

  // Manage parameter selection with validation
  const {
    selectedParams,
    validationError,
    handleParameterChange
  } = useParameterSelection(parameters, parameterMap, onParameterChange)

  // Calculate date range from periods
  const dateRange = useMemo(() => periodsToDateRange(selectedPeriods), [selectedPeriods])

  // Load series values via API
  const {
    loadedValues,
    isLoadingValues,
    loadError,
    dailyValues
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
    visibleDateRange,
    sliderMarks,
    handleRangeChange,
    handleCalendarDayClick
  } = useTimeline(dailyValues, showRangeSlider)

  // Build calendar data from series
  const calendarData = useCalendarData(showCalendar, dateRange, seriesList)

  // Prepare chart series from loaded values
  const chartSeries = useChartSeries({
    showChart,
    loadedValues,
    visibleDateRange,
    dailyValues,
    selectedParams,
    parameterMap
  })

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
          <CalendarGrid calendars={calendarData} onClick={handleCalendarDayClick} />
        </Box>
      )}

      {/* Parameter Selector */}
      <ParameterSelector
        label={t.parameterLabel}
        hint={t.parameterHint}
        placeholder={t.parameterPlaceholder}
        value={selectedParams}
        options={parameterOptions}
        validationError={validationError}
        validationErrorTitle={t.validationError}
        onChange={handleParameterChange}
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
          series={chartSeries}
          showRangeSlider={showRangeSlider}
          sliderMarks={sliderMarks}
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
