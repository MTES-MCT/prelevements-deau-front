'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import ChartWithRangeSlider from './chart-with-range-slider.js'
import {
  FALLBACK_PARAMETER_COLOR,
  PARAMETER_COLOR_MAP
} from './constants/colors.js'
import {
  getParameterMetadata, MAX_DIFFERENT_UNITS,
  DEFAULT_TRANSLATIONS
} from './constants/parameters.js'
import {formatPeriodLabel, getViewTypeLabel} from './formatters.js'
import LoadingState from './loading-state.js'
import ParameterOperatorsSelector from './parameter-operators-selector.js'
import ParameterSelector from './parameter-selector.js'
import {useChartSeries} from './use-chart-series.js'
import {useTimeline} from './use-timeline.js'
import {
  buildCalendarData,
  calculateSelectablePeriodsFromSeries,
  extractDefaultPeriodsFromSeries,
  periodsToDateRange
} from './utils/index.js'
import {
  formatValueTypeLabel,
  normalizeUnitLabel,
  normalizeValueType,
  resolveKnownValueType
} from './utils/parameter-display.js'
import {
  chooseDisplayResolution,
  resolutionToFrequency
} from './utils/time-bucketing.js'

import {buildDailyAndTimelineData} from '@/components/PrelevementsSeriesExplorer/utils/aggregation.js'
import CalendarGrid from '@/components/ui/CalendarGrid/index.js'
import PeriodSelectorHeader from '@/components/ui/PeriodSelectorHeader/index.js'
import {parseQuarterDate} from '@/lib/format-date.js'
import {formatFrequencyLabel} from '@/utils/frequency.js'
import {normalizeString} from '@/utils/string.js'
import {parseLocalDateTime} from '@/utils/time.js'

const DEFAULT_PARAMETER = 'volume prélevé'

const ParameterOptionContent = ({label, unitLabel}) => (
  <div className='selector-option-content'>
    <div className='selector-option-header'>
      <span className='selector-option-label'>{label}</span>
    </div>
    {unitLabel && (
      <span className='selector-option-unit'>{unitLabel}</span>
    )}
  </div>
)

const buildNormalizedOption = ({
  value,
  label,
  unit,
  valueType,
  disabled = false,
  disabledReason,
  title,
  content
}) => {
  const normalizedUnit = normalizeUnitLabel(unit)
  const normalizedValueType = normalizeValueType(valueType)
  const resolvedLabel = label ?? value

  return {
    value,
    label: resolvedLabel,
    unit: normalizedUnit,
    valueType: normalizedValueType,
    disabled: Boolean(disabled),
    disabledReason,
    title,
    content: content ?? (
      <ParameterOptionContent
        label={resolvedLabel}
        unitLabel={normalizedUnit}
      />
    )
  }
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
        const metadata = getParameterMetadata(option)
        return buildNormalizedOption({
          value: option,
          label: option,
          unit: metadata?.unit,
          valueType: metadata?.valueType ?? metadata?.type
        })
      }

      if (typeof option === 'object') {
        const value = option.value ?? option.parameter ?? option.label
        if (!value) {
          return null
        }

        const metadata = getParameterMetadata(value)
        return buildNormalizedOption({
          value,
          label: option.label ?? option.parameter ?? value,
          unit: option.unit ?? metadata?.unit,
          valueType: option.valueType ?? metadata?.valueType ?? metadata?.type,
          disabled: option.disabled,
          disabledReason: option.disabledReason,
          title: option.title,
          content: option.content
        })
      }

      return null
    })
    .filter(Boolean)
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

    // Handle quarter format YYYY-Q[1-4]
    const quarterDate = parseQuarterDate(entry.date)
    const parsed = quarterDate || parseLocalDateTime(entry.date)

    if (!parsed) {
      return false
    }

    return parsed >= dateRange.start && parsed <= dateRange.end
  })
}

const AggregatedSeriesExplorer = ({
  series,
  parameters,
  selectedParameters: selectedParametersProp,
  defaultParameters,
  temporalOperatorOptionsByParameter,
  selectedTemporalOperators: selectedTemporalOperatorsProp,
  defaultTemporalOperators,
  onFiltersChange,
  onDisplayResolutionChange,
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
  error = null,
  chartWidthPx = 1200
}) => {
  const t = {...DEFAULT_TRANSLATIONS, ...customTranslations}

  const parameterOptionsNormalized = useMemo(
    () => normalizeParameterOptions(parameters),
    [parameters]
  )

  const handleParametersChange = useCallback(parameters => {
    onFiltersChange?.({parameters})
  }, [onFiltersChange])

  // Derive default parameters from props or metadata
  const derivedDefaultParameters = useMemo(() => {
    if (defaultParameters && Array.isArray(defaultParameters) && defaultParameters.length > 0) {
      return defaultParameters
    }

    // Try to find 'volume prélevé' as default
    const volumeParam = parameterOptionsNormalized.find(
      opt => opt.value?.toLowerCase() === DEFAULT_PARAMETER.toLowerCase()
    )
    if (volumeParam) {
      return [volumeParam.value]
    }

    // Fallback to first available parameter
    if (parameterOptionsNormalized.length > 0) {
      return [parameterOptionsNormalized[0].value]
    }

    return []
  }, [defaultParameters, parameterOptionsNormalized])

  // Manage selected parameters as an array
  const [currentParameters, setCurrentParameters] = useState(() => {
    if (selectedParametersProp && Array.isArray(selectedParametersProp)) {
      return selectedParametersProp
    }

    return derivedDefaultParameters
  })

  // Update when props or metadata change
  useEffect(() => {
    if (selectedParametersProp && Array.isArray(selectedParametersProp)) {
      setCurrentParameters(selectedParametersProp)
    }
  }, [selectedParametersProp])

  const parameterOptionMap = useMemo(
    () => new Map(parameterOptionsNormalized.map(option => [option.value, option])),
    [parameterOptionsNormalized]
  )

  const handleParameterSelection = useCallback(newSelection => {
    if (!Array.isArray(newSelection) || newSelection.length === 0) {
      return
    }

    const filteredSelection = newSelection.filter(value => value !== null && value !== undefined)
    if (filteredSelection.length === 0) {
      return
    }

    const selectedUnits = new Set(
      filteredSelection
        .map(paramValue => parameterOptionMap.get(paramValue)?.unit)
        .filter(Boolean)
    )

    if (selectedUnits.size > MAX_DIFFERENT_UNITS) {
      return
    }

    setCurrentParameters(filteredSelection)
    handleParametersChange(filteredSelection)
  }, [parameterOptionMap, handleParametersChange])

  // Build parameter options with disabled state based on unit constraints
  // Group by valueType and put "volume prélevé" first
  const parameterOptions = useMemo(() => {
    const selectedUnits = new Set(
      currentParameters
        .map(paramValue => parameterOptionMap.get(paramValue)?.unit)
        .filter(Boolean)
    )

    const maxUnitsReached = selectedUnits.size >= MAX_DIFFERENT_UNITS

    // Apply disabled state
    const optionsWithDisabled = parameterOptionsNormalized.map(option => {
      const isEnabled = !maxUnitsReached
        || currentParameters.includes(option.value)
        || selectedUnits.has(option.unit)

      return {
        ...option,
        disabled: !isEnabled
      }
    })

    // Separate "volume prélevé" to put it first
    const volumePreleveOption = optionsWithDisabled.find(
      opt => opt.value.toLowerCase() === DEFAULT_PARAMETER.toLowerCase()
    )
    const otherOptions = optionsWithDisabled.filter(
      opt => opt.value.toLowerCase() !== DEFAULT_PARAMETER.toLowerCase()
    )

    // Group other options by valueType
    const groupedByValueType = new Map()
    for (const option of otherOptions) {
      const valueTypeLabel = formatValueTypeLabel(option.valueType) ?? 'Non spécifié'
      if (!groupedByValueType.has(valueTypeLabel)) {
        groupedByValueType.set(valueTypeLabel, [])
      }

      groupedByValueType.get(valueTypeLabel).push(option)
    }

    // Build final structure with groups
    const groups = []

    // Add "volume prélevé" first as a single-item group if it exists
    if (volumePreleveOption) {
      groups.push({
        label: formatValueTypeLabel(volumePreleveOption.valueType) ?? 'Non spécifié',
        options: [volumePreleveOption]
      })
    }

    // Add other groups sorted by label
    const sortedValueTypes = [...groupedByValueType.keys()].sort()
    for (const valueTypeLabel of sortedValueTypes) {
      // Skip if already added as volume prélevé group
      if (volumePreleveOption && formatValueTypeLabel(volumePreleveOption.valueType) === valueTypeLabel) {
        continue
      }

      groups.push({
        label: valueTypeLabel,
        options: groupedByValueType.get(valueTypeLabel)
      })
    }

    return groups
  }, [parameterOptionsNormalized, currentParameters, parameterOptionMap])

  // Series is expected to be a Map of parameter -> series data
  const seriesMap = useMemo(() => {
    if (series instanceof Map) {
      return series
    }

    return new Map()
  }, [series])

  const metadataList = useMemo(() => {
    // If we have a Map of series, extract all metadata
    if (seriesMap.size > 0) {
      const metaList = []
      for (const paramSeries of seriesMap.values()) {
        if (paramSeries?.metadata) {
          metaList.push(paramSeries.metadata)
        }
      }

      return metaList
    }

    return []
  }, [seriesMap])

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
  }, [initialPeriods])

  const handlePeriodChangeInternal = useCallback(periods => {
    setSelectedPeriods(periods)
    onFiltersChange?.({periods})
  }, [onFiltersChange])

  const dateRange = useMemo(
    () => periodsToDateRange(selectedPeriods),
    [selectedPeriods]
  )

  // Build parameter map from current selection and series metadata
  const parameterMap = useMemo(() => {
    const map = new Map()
    // Cache resolveKnownValueType calls to avoid repeated lookups
    const valueTypeCache = new Map()

    const getCachedValueType = valueType => {
      if (!valueType) {
        return null
      }

      if (valueTypeCache.has(valueType)) {
        return valueTypeCache.get(valueType)
      }

      const resolved = resolveKnownValueType(valueType)
      valueTypeCache.set(valueType, resolved)
      return resolved
    }

    for (const paramValue of currentParameters) {
      const paramSeries = seriesMap.get(paramValue)
      const metadata = getParameterMetadata(paramValue)
      const normalizedKey = normalizeString(paramValue)
      const optionMetadata = parameterOptionMap.get(paramValue)

      // Use series metadata if available, otherwise use static metadata
      const meta = paramSeries?.metadata ?? {}
      const color = meta.color
        ?? PARAMETER_COLOR_MAP.get(normalizedKey)
        ?? FALLBACK_PARAMETER_COLOR
      const frequency = meta.frequency
        ?? meta.aggregationFrequency
        ?? metadata?.frequency
        ?? null

      const resolvedMetaValueType = getCachedValueType(meta.valueType)
      const resolvedOptionValueType = getCachedValueType(optionMetadata?.valueType)
      const resolvedMetadataValueType = getCachedValueType(metadata?.valueType ?? metadata?.type)

      map.set(paramValue, {
        parameter: meta.parameter ?? paramValue,
        parameterLabel: paramValue,
        unit: meta.unit ?? metadata?.unit ?? '',
        color,
        frequency,
        valueType: resolvedMetaValueType
          ?? resolvedOptionValueType
          ?? resolvedMetadataValueType
          ?? null
      })
    }

    return map
  }, [seriesMap, currentParameters, parameterOptionMap])

  const selectedParams = useMemo(
    () => currentParameters,
    [currentParameters]
  )

  const loadedValues = useMemo(() => {
    if (currentParameters.length === 0) {
      return {}
    }

    const result = {}

    for (const param of currentParameters) {
      const paramSeries = seriesMap.get(param)
      if (paramSeries) {
        const values = paramSeries.values ?? []
        const filtered = filterValuesByDateRange(values, dateRange)
        result[param] = filtered
      }
    }

    return result
  }, [currentParameters, seriesMap, dateRange])

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
    committedSelectedRange,
    visibleSamples,
    sliderMarks,
    handleRangeChange,
    handleRangeChangeCommitted,
    handleCalendarDayClick
  } = useTimeline(timelineSamples, showRangeSlider, dateRange)

  // Calculate display resolution based on visible range
  const displayResolution = useMemo(() => {
    if (visibleSamples.length < 2) {
      return null
    }

    const firstSample = visibleSamples[0]
    const lastSample = visibleSamples.at(-1)

    if (!firstSample?.timestamp || !lastSample?.timestamp) {
      return null
    }

    const start = firstSample.timestamp instanceof Date
      ? firstSample.timestamp
      : new Date(firstSample.timestamp)
    const end = lastSample.timestamp instanceof Date
      ? lastSample.timestamp
      : new Date(lastSample.timestamp)

    return chooseDisplayResolution(start, end, chartWidthPx)
  }, [visibleSamples, chartWidthPx])

  // When fetching, only consider the last committed slider position to avoid re-fetching on drag
  const fetchDisplayResolution = useMemo(() => {
    if (!committedSelectedRange?.start || !committedSelectedRange?.end) {
      return null
    }

    return chooseDisplayResolution(
      committedSelectedRange.start,
      committedSelectedRange.end,
      chartWidthPx
    )
  }, [chartWidthPx, committedSelectedRange?.end, committedSelectedRange?.start])

  const fetchDisplayFrequency = useMemo(
    () => fetchDisplayResolution ? resolutionToFrequency(fetchDisplayResolution) : null,
    [fetchDisplayResolution]
  )

  // Resolution to show to the user: prefer the resolution used for fetching (authoritative),
  // fall back to the on-the-fly estimation from visible samples.
  const displayResolutionForUI = useMemo(
    () => fetchDisplayResolution ?? displayResolution,
    [displayResolution, fetchDisplayResolution]
  )

  const displayFrequency = useMemo(
    () => displayResolutionForUI ? resolutionToFrequency(displayResolutionForUI) : null,
    [displayResolutionForUI]
  )

  const frequencyBadges = useMemo(() => {
    if (selectedParams.length === 0) {
      return []
    }

    const badges = []

    for (const param of selectedParams) {
      const paramMeta = parameterMap.get(param)
      const frequency = paramMeta?.frequency
      if (!frequency) {
        continue
      }

      badges.push({
        parameter: paramMeta.parameter ?? paramMeta.parameterLabel ?? param,
        frequency
      })
    }

    return badges
  }, [parameterMap, selectedParams])

  // Notify parent of resolution change
  const lastSentFrequencyRef = useRef(null)
  useEffect(() => {
    if (!fetchDisplayFrequency) {
      return
    }

    if (lastSentFrequencyRef.current === fetchDisplayFrequency) {
      return
    }

    lastSentFrequencyRef.current = fetchDisplayFrequency
    onDisplayResolutionChange?.(fetchDisplayFrequency)
  }, [fetchDisplayFrequency, onDisplayResolutionChange])

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

    // Always show the chart if we already have data, even while a new fetch is running.
    const canDisplayChart = !error && allDates.length > 0

    if (canDisplayChart) {
      return (
        <Box sx={{minHeight: 360, position: 'relative'}}>
          {(frequencyBadges.length > 0 || displayResolutionForUI) && (
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: frequencyBadges.length > 0 ? 'space-between' : 'flex-end',
              gap: 1,
              mb: 1
            }}
            >
              {frequencyBadges.length > 0 ? (
                <>
                  <Typography
                    variant='caption'
                    sx={{
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      fontSize: '0.75rem'
                    }}
                  >
                    Résolution par série :
                  </Typography>
                  <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                  >
                    {frequencyBadges.map(({parameter, frequency}) => (
                      <Box
                        key={`${parameter}-${frequency}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          backgroundColor: 'action.hover'
                        }}
                      >
                        <Typography
                          variant='caption'
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 600
                          }}
                        >
                          {parameter} :{' '}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{
                            color: 'text.secondary'
                          }}
                        >
                          {formatFrequencyLabel(frequency) ?? frequency}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Typography
                  variant='caption'
                  sx={{
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    fontSize: '0.75rem'
                  }}
                >
                  Résolution : {formatFrequencyLabel(displayFrequency) ?? displayResolutionForUI}
                </Typography>
              )}
            </Box>
          )}
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
            onRangeChangeCommitted={handleRangeChangeCommitted}
          />

          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                pointerEvents: 'all'
              }}
            >
              <LoadingState message={t.loadingData} />
            </Box>
          )}
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

  // Only show "no data available" message if there are no parameters available from API
  // If we have parameters but seriesMap is empty, it means data is loading or user hasn't selected any
  if (!isLoading && (!parameters || parameters.length === 0)) {
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

      <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <ParameterSelector
          label={t.parameterLabel}
          hint={t.parameterHint}
          placeholder={t.parameterPlaceholder}
          value={currentParameters}
          options={parameterOptions}
          onChange={handleParameterSelection}
        />

        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
          <ParameterOperatorsSelector
            parameters={currentParameters}
            temporalOperatorOptionsByParameter={temporalOperatorOptionsByParameter}
            defaultTemporalOperators={defaultTemporalOperators}
            selectedTemporalOperators={selectedTemporalOperatorsProp}
            parameterOptionMap={parameterOptionMap}
            placeholder={t.operatorPlaceholder}
            onChange={parameterTemporalOperators => onFiltersChange?.({parameterTemporalOperators})}
          />
        </Box>
      </Box>

      {renderChartSection()}
    </Box>
  )
}

export default AggregatedSeriesExplorer
