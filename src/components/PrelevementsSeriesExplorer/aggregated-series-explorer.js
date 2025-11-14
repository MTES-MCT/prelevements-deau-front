'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {Box} from '@mui/material'

import ChartWithRangeSlider from './chart-with-range-slider.js'
import {
  DEFAULT_TRANSLATIONS,
  FALLBACK_PARAMETER_COLOR,
  PARAMETER_COLOR_MAP,
  normalizeParameterKey
} from './constants/colors.js'
import {FREQUENCY_OPTIONS} from './constants/parameters.js'
import {formatPeriodLabel, getViewTypeLabel} from './formatters.js'
import LoadingState from './loading-state.js'
import {useChartSeries} from './use-chart-series.js'
import {useTimeline} from './use-timeline.js'
import {
  buildCalendarData,
  calculateSelectablePeriodsFromSeries,
  extractDefaultPeriodsFromSeries,
  periodsToDateRange
} from './utils/index.js'

import {buildDailyAndTimelineData} from '@/components/PrelevementsSeriesExplorer/utils/aggregation.js'
import CalendarGrid from '@/components/ui/CalendarGrid/index.js'
import PeriodSelectorHeader from '@/components/ui/PeriodSelectorHeader/index.js'
import {useManagedSelection} from '@/hook/use-managed-selection.js'
import {parseLocalDateTime} from '@/utils/time.js'

const DEFAULT_PARAMETER = 'volume prélevé'

const TRANSLATIONS = {
  ...DEFAULT_TRANSLATIONS,
  parameterHint: 'Sélectionnez un paramètre à afficher.',
  operatorLabel: 'Opérateur',
  operatorHint: 'Choisissez la fonction appliquée aux valeurs agrégées.',
  operatorPlaceholder: 'Sélectionner un opérateur',
  frequencyLabel: 'Pas de temps',
  frequencyHint: 'Choisissez la fréquence d\'agrégation des données.',
  frequencyPlaceholder: 'Sélectionner un pas de temps'
}

const normalizeParameterOptions = options => {
  if (!options) {
    return []
  }

  return options
    .map(option => {
      if (!option) {
        return null
      }

      if (typeof option === 'string') {
        return {
          value: option,
          label: option
        }
      }

      if (typeof option === 'object') {
        const value = option.value ?? option.parameter ?? option.label
        if (!value) {
          return null
        }

        return {
          value,
          label: option.label ?? option.parameter ?? value,
          description: option.description ?? option.hint,
          disabled: option.disabled ?? false
        }
      }

      return null
    })
    .filter(Boolean)
}

const normalizeOperatorOptions = options => {
  if (!options) {
    return []
  }

  return options
    .map(option => {
      if (!option) {
        return null
      }

      if (typeof option === 'string') {
        return {
          value: option,
          label: option
        }
      }

      if (typeof option === 'object') {
        const value = option.value ?? option.label
        if (!value) {
          return null
        }

        return {
          value,
          label: option.label ?? value
        }
      }

      return null
    })
    .filter(Boolean)
}

const normalizeMetadataList = series => {
  if (series?.metadata) {
    return [series.metadata]
  }

  return []
}

/**
 * Determines the current view type based on selected periods.
 * Returns 'years' if multiple years are selected or if any period has type 'year',
 * otherwise returns 'months'.
 *
 * @param {Array} selectedPeriods - Array of period objects with properties {type, value, year}
 * @param {string} defaultInitialViewType - Default view type to return when no periods are selected
 * @returns {string} View type: 'years' or 'months'
 */
function determineCurrentViewType(selectedPeriods, defaultInitialViewType) {
  if (!selectedPeriods || selectedPeriods.length === 0) {
    return defaultInitialViewType
  }

  const years = new Set()
  for (const period of selectedPeriods) {
    if (period.type === 'year') {
      years.add(period.value)
    } else if (period.type === 'month') {
      years.add(period.year)
    }
  }

  if (years.size > 1) {
    return 'years'
  }

  const hasYearType = selectedPeriods.some(p => p.type === 'year')
  return hasYearType ? 'years' : 'months'
}

const filterValuesByDateRange = (values, dateRange) => {
  if (!Array.isArray(values) || values.length === 0) {
    return []
  }

  if (!dateRange?.start || !dateRange?.end) {
    return values
  }

  return values.filter(entry => {
    if (!entry?.date) {
      return false
    }

    const parsed = parseLocalDateTime(entry.date)
    if (!parsed) {
      return false
    }

    return parsed >= dateRange.start && parsed <= dateRange.end
  })
}

const AggregatedSeriesExplorer = ({
  series,
  parameters,
  selectedParameter: selectedParameterProp,
  defaultParameter = DEFAULT_PARAMETER,
  operatorOptions,
  selectedOperator: selectedOperatorProp,
  defaultOperator,
  enableFrequencySelect = true,
  frequencyOptions = FREQUENCY_OPTIONS,
  selectedFrequency: selectedFrequencyProp,
  defaultFrequency,
  onFiltersChange,
  defaultPeriods,
  selectablePeriods: providedSelectablePeriods,
  defaultInitialViewType = 'years',
  translations: customTranslations,
  showPeriodSelector = true,
  showCalendar = true,
  showChart = true,
  showRangeSlider = true,
  locale = 'fr-FR',
  timeSeriesChartProps,
  legendLabels,
  isLoading = false,
  error = null
}) => {
  const t = {...TRANSLATIONS, ...customTranslations}

  const parameterOptionsNormalized = useMemo(
    () => normalizeParameterOptions(parameters),
    [parameters]
  )

  const handleParameterChange = useCallback(parameter => {
    onFiltersChange?.({parameter})
  }, [onFiltersChange])

  const handleOperatorChange = useCallback(operator => {
    onFiltersChange?.({operator})
  }, [onFiltersChange])

  const handleFrequencyChange = useCallback(frequency => {
    onFiltersChange?.({frequency})
  }, [onFiltersChange])

  const {
    options: parameterOptions,
    currentValue: currentParameter,
    handleChange: handleParameterSelection
  } = useManagedSelection({
    options: parameterOptionsNormalized,
    defaultValue: defaultParameter,
    selectedValue: selectedParameterProp,
    onChange: handleParameterChange,
    metadataValue: series?.metadata?.parameter,
    fallbackDefault: DEFAULT_PARAMETER
  })

  const operatorOptionsNormalized = useMemo(
    () => normalizeOperatorOptions(operatorOptions),
    [operatorOptions]
  )

  const {
    options: normalizedOperatorOptions,
    currentValue: currentOperator,
    handleChange: handleOperatorSelection
  } = useManagedSelection({
    options: operatorOptionsNormalized,
    defaultValue: defaultOperator,
    selectedValue: selectedOperatorProp,
    onChange: handleOperatorChange,
    metadataValue: series?.metadata?.operator
  })

  const {
    currentValue: currentFrequency,
    handleChange: handleFrequencySelection
  } = useManagedSelection({
    options: frequencyOptions,
    defaultValue: defaultFrequency,
    selectedValue: selectedFrequencyProp,
    onChange: handleFrequencyChange,
    metadataValue: series?.metadata?.frequency
  })

  const metadataList = useMemo(
    () => normalizeMetadataList(series),
    [series]
  )

  const selectablePeriods = useMemo(
    () => providedSelectablePeriods ?? calculateSelectablePeriodsFromSeries(metadataList),
    [metadataList, providedSelectablePeriods]
  )

  // Track if this is the initial mount to only initialize periods once
  const isInitialMount = useRef(true)

  const initialPeriods = useMemo(() => {
    if (defaultPeriods && defaultPeriods.length > 0) {
      return defaultPeriods
    }

    return extractDefaultPeriodsFromSeries(metadataList)
  }, [defaultPeriods, metadataList])

  const [selectedPeriods, setSelectedPeriods] = useState(initialPeriods)

  // Only initialize periods on first mount, preserve user selection afterwards
  useEffect(() => {
    if (isInitialMount.current && initialPeriods) {
      setSelectedPeriods(initialPeriods)
      isInitialMount.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePeriodChangeInternal = useCallback(periods => {
    setSelectedPeriods(periods)
    onFiltersChange?.({periods})
  }, [onFiltersChange])

  const dateRange = useMemo(
    () => periodsToDateRange(selectedPeriods),
    [selectedPeriods]
  )

  const parameterLabel = useMemo(() => {
    if (series?.metadata?.parameter) {
      return series.metadata.parameter
    }

    return currentParameter || DEFAULT_PARAMETER
  }, [series, currentParameter])

  const parameterMap = useMemo(() => {
    if (!parameterLabel) {
      return new Map()
    }

    const meta = series?.metadata ?? {}
    const normalizedKey = normalizeParameterKey(meta.parameter ?? parameterLabel)
    const color = meta.color
      ?? PARAMETER_COLOR_MAP.get(normalizedKey)
      ?? FALLBACK_PARAMETER_COLOR
    const valueType = meta.valueType ?? meta.operator

    return new Map([
      [parameterLabel, {
        parameter: meta.parameter ?? parameterLabel,
        parameterLabel,
        unit: meta.unit,
        color,
        frequency: meta.frequency,
        valueType
      }]
    ])
  }, [series, parameterLabel])

  const selectedParams = useMemo(
    () => (parameterLabel ? [parameterLabel] : []),
    [parameterLabel]
  )

  const seriesValues = useMemo(
    () => series?.values ?? [],
    [series]
  )
  const filteredValues = useMemo(
    () => filterValuesByDateRange(seriesValues, dateRange),
    [seriesValues, dateRange]
  )

  const loadedValues = useMemo(() => {
    if (!parameterLabel) {
      return {}
    }

    return {
      [parameterLabel]: filteredValues
    }
  }, [parameterLabel, filteredValues])

  const {
    dailyValues,
    timelineSamples
  } = useMemo(() => buildDailyAndTimelineData({
    loadedValues,
    selectedParams
  }), [loadedValues, selectedParams])

  const {
    allDates,
    rangeIndices,
    visibleSamples,
    sliderMarks,
    handleRangeChange,
    handleCalendarDayClick
  } = useTimeline(timelineSamples, showRangeSlider)

  const chartSeries = useChartSeries({
    showChart,
    timelineSamples,
    visibleSamples,
    selectedParams,
    parameterMap
  })

  const calendarData = useMemo(() => {
    if (!showCalendar || dailyValues.length === 0) {
      return []
    }

    return buildCalendarData(dailyValues)
  }, [dailyValues, showCalendar])

  const periodLabel = useMemo(
    () => formatPeriodLabel(selectedPeriods, t.periodLabel),
    [selectedPeriods, t.periodLabel]
  )

  const viewTypeLabel = useMemo(
    () => getViewTypeLabel(selectedPeriods),
    [selectedPeriods]
  )

  const currentViewType = useMemo(() => determineCurrentViewType(selectedPeriods, defaultInitialViewType), [selectedPeriods, defaultInitialViewType])

  const {noDataMessage} = t

  // Render chart content based on loading/error/data state
  const renderChartSection = () => {
    if (!showChart) {
      return null
    }

    // Always show the slider if there are any dates in the timeline (even if no data in visible range)
    const hasAnyData = !isLoading && !error && allDates.length > 0

    if (hasAnyData) {
      return (
        <Box sx={{minHeight: 360}}>
          <ChartWithRangeSlider
            allDates={allDates}
            locale={locale}
            rangeIndices={rangeIndices}
            rangeLabel={t.rangeLabel}
            series={chartSeries}
            showRangeSlider={showRangeSlider}
            sliderMarks={sliderMarks}
            timeSeriesChartProps={timeSeriesChartProps}
            onRangeChange={handleRangeChange}
          />
        </Box>
      )
    }

    return (
      <Box sx={{
        minHeight: 360,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      >
        {isLoading && (
          <LoadingState message={t.loadingData} />
        )}

        {!isLoading && error && (
          <Alert severity='error' description={error} />
        )}

        {!isLoading && !error && allDates.length === 0 && (
          <Alert severity='info' description={noDataMessage} />
        )}
      </Box>
    )
  }

  if (!series && !isLoading) {
    return (
      <Box className='flex flex-col gap-4'>
        <Alert severity='info' description='Aucune donnée agrégée disponible' />
      </Box>
    )
  }

  return (
    <Box className='flex flex-col gap-6'>
      {showPeriodSelector && (
        <PeriodSelectorHeader
          periodLabel={periodLabel}
          viewTypeLabel={viewTypeLabel}
          defaultInitialViewType={defaultInitialViewType}
          currentViewType={currentViewType}
          defaultSelectedPeriods={selectedPeriods}
          selectablePeriods={selectablePeriods}
          onSelectionChange={handlePeriodChangeInternal}
        />
      )}

      {showCalendar && calendarData.length > 0 && (
        <Box>
          <CalendarGrid
            calendars={calendarData}
            legendLabels={legendLabels}
            onClick={handleCalendarDayClick}
          />
        </Box>
      )}

      <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
        <Box
          sx={{
            flex: '1 1 280px',
            minWidth: 240,
            maxWidth: 420
          }}
        >
          <Select
            label={t.parameterLabel}
            hintText={t.parameterHint}
            nativeSelectProps={{
              value: currentParameter ?? '',
              disabled: parameterOptions.length <= 1,
              onChange: event => handleParameterSelection(event.target.value)
            }}
          >
            <option disabled hidden value=''>
              {t.parameterPlaceholder}
            </option>
            {parameterOptions.map(option => (
              <option
                key={option.value}
                disabled={option.disabled}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </Select>
        </Box>

        {normalizedOperatorOptions.length > 0 && (
          <Box
            sx={{
              flex: '1 1 220px',
              minWidth: 220,
              maxWidth: 360
            }}
          >
            <Select
              label={t.operatorLabel}
              hintText={t.operatorHint}
              nativeSelectProps={{
                value: currentOperator ?? '',
                disabled: normalizedOperatorOptions.length <= 1,
                onChange: event => handleOperatorSelection(event.target.value)
              }}
            >
              <option disabled hidden value=''>
                {t.operatorPlaceholder}
              </option>
              {normalizedOperatorOptions.map(option => (
                <option
                  key={option.value}
                  disabled={option.disabled}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </Select>
          </Box>
        )}

        {enableFrequencySelect && (
          <Box
            sx={{
              flex: '1 1 220px',
              minWidth: 220,
              maxWidth: 360
            }}
          >
            <Select
              label={t.frequencyLabel}
              hintText={t.frequencyHint}
              nativeSelectProps={{
                value: currentFrequency ?? '',
                disabled: frequencyOptions.length <= 1,
                onChange: event => handleFrequencySelection(event.target.value)
              }}
            >
              <option disabled hidden value=''>
                {t.frequencyPlaceholder}
              </option>
              {frequencyOptions.map(option => (
                <option
                  key={option.value}
                  disabled={option.disabled}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </Select>
          </Box>
        )}
      </Box>

      {renderChartSection()}
    </Box>
  )
}

export default AggregatedSeriesExplorer
