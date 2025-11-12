'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {Box} from '@mui/material'
import {format} from 'date-fns'

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

const resolvePreferredOption = (options, preferred) => {
  if (!options || options.length === 0) {
    return ''
  }

  if (preferred) {
    const normalized = preferred.toString().trim().toLowerCase()
    const match = options.find(option => option.value?.toString().toLowerCase() === normalized)
    if (match) {
      return match.value
    }
  }

  return options[0].value
}

const matchOptionValue = (options, value) => {
  if (!value) {
    return ''
  }

  const normalized = value.toString().trim().toLowerCase()
  const match = options.find(option => option.value?.toString().toLowerCase() === normalized)
  return match ? match.value : ''
}

const normalizeMetadataList = series => {
  if (series?.metadata) {
    return [series.metadata]
  }

  return []
}

const filterValuesByDateRange = (values, dateRange) => {
  if (!Array.isArray(values) || values.length === 0) {
    return []
  }

  if (!dateRange?.start || !dateRange?.end) {
    return values
  }

  const start = format(dateRange.start, 'yyyy-MM-dd')
  const end = format(dateRange.end, 'yyyy-MM-dd')

  return values.filter(entry => entry?.date && entry.date >= start && entry.date <= end)
}

function useManagedParameterSelection({
  parameters,
  defaultParameter,
  selectedParameter,
  onParameterChange,
  metadataParameter
}) {
  const options = useMemo(
    () => normalizeParameterOptions(parameters),
    [parameters]
  )

  const resolvedDefault = useMemo(
    () => resolvePreferredOption(options, defaultParameter ?? DEFAULT_PARAMETER),
    [options, defaultParameter]
  )

  const isControlled = selectedParameter !== undefined && selectedParameter !== null
  const [internalValue, setInternalValue] = useState(resolvedDefault)

  useEffect(() => {
    if (isControlled) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, previous)
      return matched ?? resolvedDefault
    })
  }, [isControlled, options, resolvedDefault])

  useEffect(() => {
    if (isControlled || !metadataParameter) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, metadataParameter)
      if (matched && matched !== previous) {
        return matched
      }

      return previous
    })
  }, [isControlled, metadataParameter, options])

  const currentValue = isControlled
    ? matchOptionValue(options, selectedParameter) || resolvedDefault
    : internalValue

  const handleChange = useCallback(value => {
    const matched = matchOptionValue(options, value)
    if (!matched) {
      return
    }

    if (!isControlled) {
      setInternalValue(matched)
    }

    onParameterChange?.(matched)
  }, [isControlled, onParameterChange, options])

  return {
    options,
    currentValue,
    handleChange,
    resolvedDefault
  }
}

function useManagedOperatorSelection({
  operatorOptions,
  defaultOperator,
  selectedOperator,
  onOperatorChange,
  metadataOperator
}) {
  const options = useMemo(
    () => normalizeOperatorOptions(operatorOptions),
    [operatorOptions]
  )

  const resolvedDefault = useMemo(
    () => resolvePreferredOption(options, defaultOperator),
    [options, defaultOperator]
  )

  const isControlled = selectedOperator !== undefined && selectedOperator !== null
  const [internalValue, setInternalValue] = useState(resolvedDefault)

  useEffect(() => {
    if (isControlled) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, previous)
      return matched ?? resolvedDefault
    })
  }, [isControlled, options, resolvedDefault])

  useEffect(() => {
    if (isControlled || !metadataOperator) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, metadataOperator)
      if (matched && matched !== previous) {
        return matched
      }

      return previous
    })
  }, [isControlled, metadataOperator, options])

  const currentValue = isControlled
    ? matchOptionValue(options, selectedOperator) || resolvedDefault
    : internalValue

  const handleChange = useCallback(value => {
    const matched = matchOptionValue(options, value)
    if (!matched) {
      return
    }

    if (!isControlled) {
      setInternalValue(matched)
    }

    onOperatorChange?.(matched)
  }, [isControlled, onOperatorChange, options])

  return {
    options,
    currentValue,
    handleChange,
    resolvedDefault
  }
}

function useManagedFrequencySelection({
  defaultFrequency,
  selectedFrequency,
  onFrequencyChange,
  metadataFrequency
}) {
  const resolvedDefault = useMemo(
    () => resolvePreferredOption(FREQUENCY_OPTIONS, defaultFrequency),
    [defaultFrequency]
  )

  const isControlled = selectedFrequency !== undefined && selectedFrequency !== null
  const [internalValue, setInternalValue] = useState(resolvedDefault)

  useEffect(() => {
    if (isControlled) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(FREQUENCY_OPTIONS, previous)
      return matched ?? resolvedDefault
    })
  }, [isControlled, resolvedDefault])

  useEffect(() => {
    if (isControlled || !metadataFrequency) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(FREQUENCY_OPTIONS, metadataFrequency)
      if (matched && matched !== previous) {
        return matched
      }

      return previous
    })
  }, [isControlled, metadataFrequency])

  const currentValue = isControlled
    ? matchOptionValue(FREQUENCY_OPTIONS, selectedFrequency) || resolvedDefault
    : internalValue

  const handleChange = useCallback(value => {
    const matched = matchOptionValue(FREQUENCY_OPTIONS, value)
    if (!matched) {
      return
    }

    if (!isControlled) {
      setInternalValue(matched)
    }

    onFrequencyChange?.(matched)
  }, [isControlled, onFrequencyChange])

  return {
    currentValue,
    handleChange,
    resolvedDefault
  }
}

const AggregatedSeriesExplorer = ({
  series,
  parameters,
  selectedParameter: selectedParameterProp,
  defaultParameter = DEFAULT_PARAMETER,
  onParameterChange,
  operatorOptions,
  selectedOperator: selectedOperatorProp,
  defaultOperator,
  onOperatorChange,
  enableFrequencySelect = true,
  selectedFrequency: selectedFrequencyProp,
  defaultFrequency,
  onFrequencyChange,
  onPeriodChange,
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

  const {
    options: parameterOptions,
    currentValue: currentParameter,
    handleChange: handleParameterChange
  } = useManagedParameterSelection({
    parameters,
    defaultParameter,
    selectedParameter: selectedParameterProp,
    onParameterChange,
    metadataParameter: series?.metadata?.parameter
  })

  const {
    options: normalizedOperatorOptions,
    currentValue: currentOperator,
    handleChange: handleOperatorSelection
  } = useManagedOperatorSelection({
    operatorOptions,
    defaultOperator,
    selectedOperator: selectedOperatorProp,
    onOperatorChange,
    metadataOperator: series?.metadata?.operator
  })

  const {
    currentValue: currentFrequency,
    handleChange: handleFrequencySelection
  } = useManagedFrequencySelection({
    defaultFrequency,
    selectedFrequency: selectedFrequencyProp,
    onFrequencyChange,
    metadataFrequency: series?.metadata?.frequency
  })

  const metadataList = useMemo(
    () => normalizeMetadataList(series),
    [series]
  )

  const selectablePeriods = useMemo(
    () => providedSelectablePeriods ?? calculateSelectablePeriodsFromSeries(metadataList),
    [metadataList, providedSelectablePeriods]
  )

  const initialPeriods = useMemo(() => {
    if (defaultPeriods && defaultPeriods.length > 0) {
      return defaultPeriods
    }

    return extractDefaultPeriodsFromSeries(metadataList)
  }, [defaultPeriods, metadataList])

  const initialPeriodsKey = useMemo(
    () => JSON.stringify(initialPeriods ?? []),
    [initialPeriods]
  )

  const [selectedPeriods, setSelectedPeriods] = useState(initialPeriods)

  useEffect(() => {
    if (initialPeriodsKey) {
      setSelectedPeriods(JSON.parse(initialPeriodsKey))
    } else {
      setSelectedPeriods([])
    }
  }, [initialPeriodsKey])

  const handlePeriodChange = useCallback(periods => {
    setSelectedPeriods(periods)
    onPeriodChange?.(periods)
  }, [onPeriodChange])

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

  const currentViewType = useMemo(() => {
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
  }, [selectedPeriods, defaultInitialViewType])

  const noDataMessage = 'Aucune donnée disponible avec les critères choisis.'

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
          onSelectionChange={handlePeriodChange}
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
              onChange: event => handleParameterChange(event.target.value)
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
                disabled: FREQUENCY_OPTIONS.length <= 1,
                onChange: event => handleFrequencySelection(event.target.value)
              }}
            >
              <option disabled hidden value=''>
                {t.frequencyPlaceholder}
              </option>
              {FREQUENCY_OPTIONS.map(option => (
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

      {showChart && (
        <Box sx={{minHeight: 360}}>
          {!isLoading && !error && chartSeries.length > 0 ? (
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
          ) : (
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

              {!isLoading && !error && chartSeries.length === 0 && (
                <Alert severity='info' description={noDataMessage} />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default AggregatedSeriesExplorer
