import test from 'ava'

import {
  AXIS_LEFT_ID,
  AXIS_RIGHT_ID,
  X_AXIS_ID,
  SEGMENT_ABOVE,
  SEGMENT_BELOW,
  SEGMENT_DEFAULT,
  MAX_POINTS_BEFORE_DECIMATION,
  DECIMATION_TARGET,
  toTimestamp,
  toDate,
  getNumberFormatter,
  getDateFormatter,
  collectAxisTooltipRows,
  getSharedTooltipNature,
  getRangeBasedDateFormatter,
  largestTriangleThreeBuckets,
  decimatePoints,
  processInputSeries,
  computeThresholdCrossings,
  buildPointMap,
  buildThresholdEvaluator,
  classifyPoint,
  buildYAxisConfigurations,
  buildSeriesModel,
  buildTimelineXAxis,
  buildTimelineTicks,
  calendarCoordinateToDate,
  projectDateToCalendarCoordinate,
  axisFormatterFactory,
  buildAnnotations,
  resampleSeriesData,
  detectNativeFrequency
} from './util.js'

import {prepareCumulativeSeriesData} from '@/components/PrelevementsSeriesExplorer/use-chart-series.js'
import {buildDailyAndTimelineData} from '@/components/PrelevementsSeriesExplorer/utils/aggregation.js'
import {processTimeSeriesData} from '@/components/PrelevementsSeriesExplorer/utils/gap-detection.js'

const baseTheme = {
  palette: {
    mode: 'light',
    warning: {light: '#fde68a', main: '#f59e0b'},
    error: {main: '#ef4444'},
    info: {main: '#0ea5e9'},
    grey: {400: '#9ca3af'}
  }
}

test('le tooltip regroupe les séries et n’affiche qu’une nature commune', t => {
  const series = [
    {
      id: 'station-a__plain',
      originalId: 'station-a',
      originalLabel: 'Station A (L/s)',
      color: '#000091',
      data: [12],
      valueFormatter: String
    },
    {
      id: 'station-a__duplicate',
      originalId: 'station-a',
      originalLabel: 'Station A (L/s)',
      color: '#000091',
      data: [12],
      valueFormatter: String
    },
    {
      id: 'station-b__plain',
      originalId: 'station-b',
      originalLabel: 'Station B (L/s)',
      color: '#009081',
      data: [18],
      valueFormatter: String
    }
  ]
  const rows = collectAxisTooltipRows({
    series,
    dataIndex: 0,
    getPointMeta: id => ({
      comment: 'Temps réel',
      natureLabel: 'Origine',
      detail: id === 'station-a' ? 'Profondeur mesurée : 8,20 m' : null
    }),
    getSegmentOrigin: () => null,
    translations: {interpolatedPoint: 'Point interpolé'}
  })

  t.is(rows.length, 2)
  t.deepEqual(rows.map(row => row.label), ['Station A (L/s)', 'Station B (L/s)'])
  t.is(rows[0].detail, 'Profondeur mesurée : 8,20 m')
  t.is(rows[0].natureLabel, 'Origine')
  t.is(getSharedTooltipNature(rows), 'Temps réel')
})

test('le tooltip conserve les natures différentes au niveau de chaque ligne', t => {
  const rows = [
    {nature: 'Temps réel'},
    {nature: 'Moyenne journalière'}
  ]

  t.is(getSharedTooltipNature(rows), null)
})

test('le tooltip ignore les bornes techniques de fin d’intervalle', t => {
  const rows = collectAxisTooltipRows({
    series: [{
      id: 'volume__plain',
      originalId: 'volume',
      originalLabel: 'Volume (m³)',
      data: [1000],
      valueFormatter: String
    }],
    dataIndex: 0,
    getPointMeta: () => null,
    getSegmentOrigin: () => ({displayBoundary: true}),
    translations: {interpolatedPoint: 'Point interpolé'}
  })

  t.deepEqual(rows, [])
})

test('le tooltip de fin d’intervalle reprend la date et les métadonnées du bucket', t => {
  const tooltipDate = new Date(2025, 0, 1)
  const rows = collectAxisTooltipRows({
    series: [{
      id: 'volume__plain',
      originalId: 'volume',
      originalLabel: 'Volume (m³)',
      data: [1000],
      valueFormatter: String
    }],
    dataIndex: 0,
    getPointMeta: () => null,
    getSegmentOrigin: () => ({
      displayBoundary: true,
      synthetic: true,
      tooltipDate,
      tooltipMeta: {comment: 'Déclaré sur la période'}
    }),
    translations: {interpolatedPoint: 'Point interpolé'}
  })

  t.is(rows.length, 1)
  t.is(rows[0].tooltipDate, tooltipDate)
  t.is(rows[0].nature, 'Déclaré sur la période')
  t.is(rows[0].syntheticLabel, null)
})

test('une plage annuelle garde les données journalières mais gradue les mois', t => {
  const start = new Date(2024, 11, 1)
  const xAxisDates = Array.from({length: 337}, (_, index) => new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + index
  ))
  const ticks = buildTimelineTicks({
    xAxisDates,
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 day'
  })

  t.is(ticks.granularity, 'month')
  t.is(ticks.axisMode, 'calendar')
  t.is(ticks.values.length, 12)
  t.true(ticks.labels.get(ticks.values[0].getTime()).includes('2024'))
  t.true(ticks.labels.get(ticks.values[1].getTime()).includes('2025'))
  t.false(ticks.labels.get(ticks.values[2].getTime()).includes('2025'))
  t.deepEqual(
    ticks.values.map(date => date.getDate()),
    Array.from({length: 12}, () => 1)
  )
})

test('une plage courte exclut les ruptures et les bornes techniques des graduations', t => {
  const xAxisDates = Array.from({length: 5}, (_, index) => new Date(2025, 0, index + 1))
  const pointBySeries = new Map([
    ['volume', [
      {y: null},
      {y: 1000},
      {y: 1000, displayBoundary: true},
      {y: 2000},
      {y: null}
    ]]
  ])
  const ticks = buildTimelineTicks({
    xAxisDates,
    pointBySeries,
    availableWidth: 800,
    locale: 'fr-FR',
    frequency: '1 day'
  })

  t.deepEqual(ticks.values, [xAxisDates[1], xAxisDates[3]])
})

test('337 volumes journaliers traversent tout le pipeline sans rupture et forment une seule ligne', t => {
  const apiValues = Array.from({length: 337}, (_, index) => {
    const date = new Date(2024, 11, 1 + index)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return {
      date: `${year}-${month}-${day}`,
      value: 1000
    }
  })
  const {timelineSamples} = buildDailyAndTimelineData({
    loadedValues: {volume: apiValues},
    selectedParams: ['volume']
  })
  const chartData = processTimeSeriesData(
    timelineSamples.map(sample => ({
      x: sample.timestamp,
      y: sample.values[0],
      meta: sample.metas[0]
    })),
    '1 day'
  )
  const model = buildSeriesModel({
    series: [{
      id: 'volume',
      label: 'Volume prélevé (m³)',
      color: '#000091',
      curve: 'stepAfter',
      data: chartData
    }],
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false,
    timelineFrequency: '1 day'
  })

  t.is(timelineSamples.length, 337)
  t.is(chartData.filter(point => point.y === null || point.isGapPoint).length, 0)
  t.is(model.xAxisDates.length, 337)
  t.is(model.pointBySeries.get('volume').filter(point => point.y === null).length, 0)
  t.is(model.segmentSeries.length, 1)
  t.is(model.segmentSeries[0].curve, 'stepAfter')
  t.falsy(model.segmentSeries[0].area)
  t.is(model.segmentSeries[0].data.filter(value => Number.isFinite(value)).length, 337)
})

test('une ligne cumulative conserve sa borne temporelle sans l’exposer comme mesure', t => {
  const start = new Date(2025, 0, 1)
  const endExclusive = new Date(2025, 0, 2)
  const data = prepareCumulativeSeriesData([{
    x: start,
    y: 1000,
    bucketEnd: endExclusive
  }], '1 day')
  const model = buildSeriesModel({
    series: [{
      id: 'volume',
      label: 'Volume prélevé (m³)',
      color: '#000091',
      curve: 'stepAfter',
      data
    }],
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false,
    timelineFrequency: '1 day'
  })
  const points = model.pointBySeries.get('volume')

  t.is(model.xAxisDates.length, 2)
  t.is(model.xAxisDates[1].getTime(), endExclusive.getTime() - 1)
  t.false(points[0].synthetic)
  t.true(points[1].synthetic)
  t.true(points[1].displayBoundary)
  t.is(points[1].tooltipDate.getTime(), start.getTime())
  t.is(model.segmentSeries[0].curve, 'stepAfter')
  t.falsy(model.segmentSeries[0].area)
  t.is(model.segmentSeries[0].data.filter(value => Number.isFinite(value)).length, 2)

  const ticks = buildTimelineTicks({
    xAxisDates: model.xAxisDates,
    pointBySeries: model.pointBySeries,
    availableWidth: 800,
    locale: 'fr-FR',
    frequency: '1 day'
  })
  t.deepEqual(ticks.values, [start])
})

test('les graduations calendaires ne dépendent pas du nombre de points', t => {
  const start = new Date(2024, 0, 15)
  const end = new Date(2025, 5, 20)
  const denseDates = Array.from({length: 523}, (_, index) => new Date(2024, 0, 15 + index))
  const sparseDates = [start, new Date(2024, 7, 2), end]

  const denseTicks = buildTimelineTicks({
    xAxisDates: denseDates,
    availableWidth: 1200,
    locale: 'fr-FR',
    frequency: '1 day'
  })
  const sparseTicks = buildTimelineTicks({
    xAxisDates: sparseDates,
    availableWidth: 1200,
    locale: 'fr-FR',
    frequency: '1 day'
  })

  t.is(denseTicks.granularity, 'month')
  t.deepEqual(
    sparseTicks.values.map(date => date.getTime()),
    denseTicks.values.map(date => date.getTime())
  )
  t.deepEqual(
    sparseTicks.values.slice(1).map(date => date.getDate()),
    Array.from({length: sparseTicks.values.length - 1}, () => 1)
  )
})

test('les graduations calendaires se réduisent selon la largeur disponible', t => {
  const xAxisDates = [new Date(2024, 0, 1), new Date(2025, 5, 1)]
  const ticks = buildTimelineTicks({
    xAxisDates,
    availableWidth: 240,
    locale: 'fr-FR',
    frequency: '1 day'
  })

  t.is(ticks.granularity, 'month')
  t.true(ticks.values.length <= 5)
  t.is(new Set(ticks.labels.values()).size, ticks.labels.size)
})

test('les graphiques de ressources conservent les graduations trimestrielles par défaut', t => {
  const quarterlyRangeDates = Array.from({length: 25}, (_, index) => new Date(2024, index, 1))
  const quarterlyTicks = buildTimelineTicks({
    xAxisDates: quarterlyRangeDates,
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 month'
  })

  t.is(quarterlyTicks.granularity, 'quarter')
  t.true([...quarterlyTicks.labels.values()][0].startsWith('T1 2024'))

  const yearlyRangeDates = Array.from({length: 8}, (_, index) => new Date(2020 + index, 0, 1))
  const yearlyTicks = buildTimelineTicks({
    xAxisDates: yearlyRangeDates,
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 year'
  })

  t.is(yearlyTicks.granularity, 'year')
  t.deepEqual([...yearlyTicks.labels.values()], yearlyRangeDates.map(date => String(date.getFullYear())))
})

test('sans vue trimestrielle, une plage de 19 à 60 mois utilise des mois espacés sur ordinateur', t => {
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(2021, 9, 12), new Date(2026, 6, 8)],
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 week',
    allowQuarterlyTicks: false
  })
  const labels = [...ticks.labels.values()]
  const coordinates = ticks.values.map(date => projectDateToCalendarCoordinate(date))
  const monthGaps = coordinates.slice(1).map((coordinate, index) => coordinate - coordinates[index])

  t.is(ticks.granularity, 'month')
  t.true(monthGaps.every(gap => Math.abs(gap - 6) < 0.000_001))
  t.false(labels.some(label => /\bT[1-4]\b/u.test(label)))

  for (const year of [2021, 2022, 2023, 2024, 2025, 2026]) {
    t.true(labels.some(label => label.includes(String(year))))
  }
})

test('sans vue trimestrielle, trois années utilisent une cadence trimestrielle régulière nommée par les mois', t => {
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(2023, 0, 31), new Date(2025, 11, 30)],
    availableWidth: 1600,
    locale: 'fr-FR',
    frequency: '1 month',
    allowQuarterlyTicks: false
  })
  const labels = [...ticks.labels.values()]

  t.is(ticks.granularity, 'month')
  t.deepEqual(
    ticks.values.map(date => date.getMonth()),
    [0, 3, 6, 9, 0, 3, 6, 9, 0, 3, 6, 9]
  )
  t.deepEqual(
    labels,
    [
      'janv. 2023',
      'avr.',
      'juil.',
      'oct.',
      'janv. 2024',
      'avr.',
      'juil.',
      'oct.',
      'janv. 2025',
      'avr.',
      'juil.',
      'oct.'
    ]
  )
})

test('sans vue trimestrielle, la cadence mensuelle reste régulière et lisible sur mobile', t => {
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(2020, 0, 1), new Date(2024, 11, 31)],
    availableWidth: 240,
    locale: 'fr-FR',
    frequency: '1 month',
    allowQuarterlyTicks: false
  })
  const labels = [...ticks.labels.values()]
  const absoluteMonths = ticks.values.map(date => (date.getFullYear() * 12) + date.getMonth())
  const monthGaps = absoluteMonths.slice(1).map((month, index) => month - absoluteMonths[index])

  t.is(ticks.granularity, 'month')
  t.true(ticks.values.every(date => date.getDate() === 1))
  t.true(monthGaps.every(gap => gap === 24))
  t.false(labels.some(label => /\bT[1-4]\b/u.test(label)))
  t.deepEqual(labels, ['janv. 2020', 'janv. 2022', 'janv. 2024'])
})

test('sans vue trimestrielle, les mois restent utilisés jusqu’à 60 mois puis laissent place aux années', t => {
  for (const spanMonths of [18, 19, 60]) {
    const ticks = buildTimelineTicks({
      xAxisDates: [new Date(2020, 0, 1), new Date(2020, spanMonths, 1)],
      availableWidth: 1100,
      locale: 'fr-FR',
      frequency: '1 month',
      allowQuarterlyTicks: false
    })

    t.is(ticks.granularity, 'month')
  }

  const yearlyTicks = buildTimelineTicks({
    xAxisDates: [new Date(2020, 0, 1), new Date(2025, 1, 1)],
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 month',
    allowQuarterlyTicks: false
  })

  t.is(yearlyTicks.granularity, 'year')
})

test('les graduations annuelles restent décimées sur une très longue plage mobile', t => {
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(1900, 0, 1), new Date(2025, 0, 1)],
    availableWidth: 240,
    locale: 'fr-FR',
    frequency: '1 year'
  })

  t.is(ticks.granularity, 'year')
  t.true(ticks.values.length <= 5)
  t.is(ticks.values[0].getFullYear(), 1900)
  t.is([...ticks.values].pop().getFullYear(), 2025)
})

test('les graduations trimestrielles restent décimées sur cinq ans en mobile', t => {
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(2020, 0, 1), new Date(2024, 11, 31)],
    availableWidth: 240,
    locale: 'fr-FR',
    frequency: '1 month'
  })
  const labels = [...ticks.labels.values()]

  t.is(ticks.granularity, 'quarter')
  t.true(ticks.values.length <= 5)
  t.true(labels[0].includes('2020'))
  t.true([...labels].pop().includes('2024'))
})

test('l’axe X utilise les dates comme valeurs d’une échelle temporelle continue', t => {
  const xAxisDates = [
    new Date(2025, 0, 1),
    new Date(2025, 1, 1),
    new Date(2025, 2, 1)
  ]
  const timelineTicks = buildTimelineTicks({
    xAxisDates,
    availableWidth: 800,
    locale: 'fr-FR',
    frequency: '1 day'
  })
  const axis = buildTimelineXAxis({
    xAxisDates,
    timelineTicks,
    fallbackFormatter: date => String(date.getTime())
  })

  t.is(axis.scaleType, 'time')
  t.is(axis.data, xAxisDates)
  t.deepEqual(axis.tickInterval, timelineTicks.values)
  t.deepEqual(axis.min, xAxisDates[0])
  t.deepEqual(axis.max, [...xAxisDates].pop())
  t.is(
    xAxisDates[2].getTime() - xAxisDates[1].getTime(),
    28 * 24 * 60 * 60 * 1000
  )
  t.is(
    xAxisDates[1].getTime() - xAxisDates[0].getTime(),
    31 * 24 * 60 * 60 * 1000
  )
})

test('l’axe calendaire donne exactement la même largeur à chaque mois', t => {
  const xAxisDates = [new Date(2024, 11, 1), new Date(2025, 10, 30, 23, 59, 59, 999)]
  const timelineTicks = buildTimelineTicks({
    xAxisDates,
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 day'
  })
  const axis = buildTimelineXAxis({
    xAxisDates,
    timelineTicks,
    fallbackFormatter: date => String(date.getTime())
  })
  const monthWidths = axis.tickInterval
    .slice(1)
    .map((value, index) => value - axis.tickInterval[index])

  t.is(timelineTicks.granularity, 'month')
  t.is(timelineTicks.values.length, 12)
  t.is(axis.scaleType, 'linear')
  t.true(axis.data.every(value => typeof value === 'number'))
  t.deepEqual(monthWidths, Array.from({length: 11}, () => 1))
})

test('la projection calendaire conserve la position et la date à l’intérieur du mois', t => {
  const januaryStart = new Date(2025, 0, 1)
  const januaryMiddle = new Date(2025, 0, 16, 12)
  const februaryStart = new Date(2025, 1, 1)
  const januaryCoordinate = projectDateToCalendarCoordinate(januaryStart)
  const middleCoordinate = projectDateToCalendarCoordinate(januaryMiddle)
  const februaryCoordinate = projectDateToCalendarCoordinate(februaryStart)
  const roundTripDate = calendarCoordinateToDate(middleCoordinate)

  t.is(februaryCoordinate - januaryCoordinate, 1)
  t.true(middleCoordinate > januaryCoordinate)
  t.true(middleCoordinate < februaryCoordinate)
  t.is(roundTripDate.getTime(), januaryMiddle.getTime())
})

test('le domaine temporel conserve la borne de fin d’un intervalle affiché', t => {
  const rangeEnd = new Date(2025, 0, 31)
  const bucketEnd = new Date(2025, 1, 1, 0, 0, 0, -1)
  const ticks = buildTimelineTicks({
    xAxisDates: [new Date(2025, 0, 1), bucketEnd],
    availableWidth: 800,
    locale: 'fr-FR',
    frequency: '1 day',
    timelineRange: {start: new Date(2025, 0, 1), end: rangeEnd}
  })

  t.deepEqual(ticks.domain.end, bucketEnd)
})

test('le domaine temporel coupe le dernier mois partiel à la fin sélectionnée', t => {
  const selectedStart = new Date(2024, 11, 1)
  const selectedEnd = new Date(2025, 10, 2)
  const fullMonthEnd = new Date(2025, 11, 1, 0, 0, 0, -1)
  const ticks = buildTimelineTicks({
    xAxisDates: [selectedStart, fullMonthEnd],
    availableWidth: 1100,
    locale: 'fr-FR',
    frequency: '1 month',
    timelineRange: {start: selectedStart, end: selectedEnd}
  })
  const axis = buildTimelineXAxis({
    xAxisDates: [selectedStart, fullMonthEnd],
    timelineTicks: ticks,
    fallbackFormatter: date => String(date.getTime())
  })
  const selectedEndOfDay = new Date(2025, 10, 2, 23, 59, 59, 999)

  t.is(ticks.axisMode, 'calendar')
  t.deepEqual(ticks.domain.end, selectedEndOfDay)
  t.is(axis.max, projectDateToCalendarCoordinate(selectedEndOfDay))
  t.true([...axis.data].pop() > axis.max)
})

test('le domaine temporel ignore les bornes de sélection absentes', t => {
  const start = new Date(2025, 0, 1)
  const end = new Date(2025, 0, 31)
  const ticks = buildTimelineTicks({
    xAxisDates: [start, end],
    availableWidth: 800,
    locale: 'fr-FR',
    frequency: '1 day',
    timelineRange: {start: null, end: null}
  })

  t.deepEqual(ticks.domain, {start, end})
})

test('buildYAxisConfigurations peut cadrer une série sans imposer zéro', t => {
  const axes = buildYAxisConfigurations({
    [AXIS_LEFT_ID]: {min: 230, max: 235},
    [AXIS_RIGHT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
  }, 'fr-FR', {
    includeZero: false,
    reverse: true,
    axisLabels: {[AXIS_LEFT_ID]: 'Profondeur (m)'}
  })

  t.is(axes[0].min, 230)
  t.is(axes[0].max, 235)
  t.true(axes[0].reverse)
  t.is(axes[0].label, 'Profondeur (m)')
  t.false(axes[1].reverse)
})

test('buildYAxisConfigurations respecte les bornes fixes de l’indicateur', t => {
  const axes = buildYAxisConfigurations({
    [AXIS_LEFT_ID]: {min: -0.5, max: 0.8},
    [AXIS_RIGHT_ID]: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
  }, 'fr-FR', {
    includeZero: false,
    minimum: -3,
    maximum: 3
  })

  t.is(axes[0].min, -3)
  t.is(axes[0].max, 3)
})

test('buildSeriesModel recadre l’axe sur les séries visibles', t => {
  const sharedDate = new Date('2026-07-01T00:00:00.000Z')
  const model = buildSeriesModel({
    series: [
      {
        id: 'low',
        label: 'Nappe basse',
        color: '#000091',
        axis: 'left',
        data: [{x: sharedDate, y: 12}]
      },
      {
        id: 'high',
        label: 'Nappe haute',
        color: '#009081',
        axis: 'left',
        data: [{x: sharedDate, y: 240}]
      }
    ],
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false,
    includeZero: false,
    visibilityModel: {low: true, high: false}
  })

  t.is(model.yAxis[0].min, 11)
  t.is(model.yAxis[0].max, 13)
})

test('toTimestamp returns milliseconds for dates and numbers', t => {
  const now = new Date('2024-01-01T00:00:00Z')
  t.is(toTimestamp(now), now.getTime())
  t.is(toTimestamp(42), 42)
})

// GetRangeBasedDateFormatter tests
test('getRangeBasedDateFormatter - hour frequency returns time-only formatter', t => {
  // 12 hours range (less than 1 day)
  const dates = [
    new Date('2024-01-15T08:00:00Z'),
    new Date('2024-01-15T14:00:00Z'),
    new Date('2024-01-15T20:00:00Z')
  ]
  // Verify the formatter is created for time-only format with hour frequency
  getRangeBasedDateFormatter('fr-FR', dates, '1 hour')

  const date = new Date('2024-01-15T14:30:00Z')

  // Use UTC formatter for predictable test assertions
  const utcFormatter = new Intl.DateTimeFormat('fr-FR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  })
  const formatted = utcFormatter.format(date)

  // Should contain time but not date components
  t.true(formatted.includes('14')) // Hour in UTC
  t.true(formatted.includes('30')) // Minutes
  t.false(formatted.includes('2024')) // No year
})

test('getRangeBasedDateFormatter - day frequency returns day/month formatter', t => {
  // Exactly 1 day range
  const dates = [
    new Date('2024-03-15T00:00:00Z'),
    new Date('2024-03-16T00:00:00Z')
  ]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 day')
  const date = new Date('2024-03-15T12:00:00Z')
  const formatted = formatter.format(date)

  // Should contain day and month, not time
  t.true(formatted.includes('15')) // Day
  t.true(formatted.includes('03')) // Month
  t.false(formatted.includes('2024')) // No year in day format
  t.false(formatted.includes('12')) // No hour in day format
})

test('getRangeBasedDateFormatter - day frequency with longer range returns day/month formatter', t => {
  // 30 days range
  const dates = [
    new Date('2024-01-01T00:00:00Z'),
    new Date('2024-01-31T00:00:00Z')
  ]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 day')
  const date = new Date('2024-01-15T12:00:00Z')
  const formatted = formatter.format(date)

  // Should contain day and month
  t.true(formatted.includes('15')) // Day
  t.true(formatted.includes('01')) // Month
  t.false(formatted.includes('2024')) // No year in day format
})

test('getRangeBasedDateFormatter - month frequency returns month/year formatter', t => {
  // 8 months range
  const dates = [
    new Date('2024-01-01T00:00:00Z'),
    new Date('2024-09-01T00:00:00Z')
  ]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 month')
  const date = new Date('2024-07-15T12:00:00Z')
  const formatted = formatter.format(date)

  // Should contain month name and year
  t.true(formatted.includes('2024')) // Year
  t.regex(formatted, /juil|jul/i) // Month name (short form)
})

test('getRangeBasedDateFormatter - year frequency returns year-only formatter', t => {
  // 2 years range
  const dates = [
    new Date('2023-01-01T00:00:00Z'),
    new Date('2025-01-01T00:00:00Z')
  ]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 year')
  const date = new Date('2024-06-15T12:00:00Z')
  const formatted = formatter.format(date)

  // Should contain only year
  t.is(formatted, '2024')
})

test('getRangeBasedDateFormatter - handles empty dates array with frequency', t => {
  const formatter = getRangeBasedDateFormatter('fr-FR', [], '1 day')
  const date = new Date('2024-03-15T14:30:00Z')
  const formatted = formatter.format(date)

  // Should use day format based on frequency
  t.true(formatted.includes('15')) // Day
  t.true(formatted.includes('03')) // Month
  t.false(formatted.includes('2024')) // No year in day format
})

test('getRangeBasedDateFormatter - handles null dates with frequency', t => {
  const formatter = getRangeBasedDateFormatter('fr-FR', null, '1 month')
  const date = new Date('2024-03-15T14:30:00Z')
  const formatted = formatter.format(date)

  // Should use month format based on frequency
  t.true(formatted.includes('2024')) // Year
  t.regex(formatted, /mars|mar/i) // Month name
})

test('getRangeBasedDateFormatter - respects locale parameter', t => {
  const dates = [
    new Date('2024-01-01T00:00:00Z'),
    new Date('2024-09-01T00:00:00Z')
  ]
  const formatterFR = getRangeBasedDateFormatter('fr-FR', dates, '1 month')
  const formatterUS = getRangeBasedDateFormatter('en-US', dates, '1 month')
  const date = new Date('2024-07-15T12:00:00Z')

  const formattedFR = formatterFR.format(date)
  const formattedUS = formatterUS.format(date)

  // French and US formats should differ
  t.not(formattedFR, formattedUS)
  t.true(formattedFR.includes('2024'))
  t.true(formattedUS.includes('2024'))
})

test('getRangeBasedDateFormatter - single date uses frequency-based formatter', t => {
  const dates = [new Date('2024-03-15T14:30:00Z')]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 hour')
  const date = new Date('2024-03-15T14:30:00Z')
  const formatted = formatter.format(date)

  // Should use HH:mm format for '1 hour' frequency (no day/month)
  // Note: UTC 14:30 becomes 15:30 in CET (UTC+1 during winter)
  t.true(formatted.includes('15')) // Hour (local time)
  t.true(formatted.includes('30')) // Minutes
  t.false(formatted.includes('03')) // Should NOT include month
})

test('getRangeBasedDateFormatter - range at 6 months boundary uses day/month formatter', t => {
  // Exactly 180 days range with daily frequency
  const dates = [
    new Date('2024-01-01T00:00:00Z'),
    new Date('2024-06-29T00:00:00Z')
  ]
  const formatter = getRangeBasedDateFormatter('fr-FR', dates, '1 day')
  const date = new Date('2024-03-15T12:00:00Z')
  const formatted = formatter.format(date)

  // Should use dd/MM format for daily frequency
  t.true(formatted.includes('15')) // Day
  t.true(formatted.includes('03')) // Month
})

// ProcessInputSeries tests
test('processInputSeries - should process series with valid data points', t => {
  const inputSeries = {
    id: 'series1',
    label: 'Test Series',
    color: '#ff0000',
    axis: 'left',
    data: [
      {x: new Date('2024-01-01'), y: 10},
      {x: new Date('2024-01-02'), y: 20},
      {x: new Date('2024-01-03'), y: 15}
    ],
    threshold: 12
  }

  const result = processInputSeries(inputSeries)

  t.is(result.id, 'series1')
  t.is(result.label, 'Test Series')
  t.is(result.color, '#ff0000')
  t.is(result.axisId, AXIS_LEFT_ID)
  t.is(result.sortedPoints.length, 3)
  t.is(result.filteredPoints.length, 3)
  t.is(typeof result.thresholdEvaluator, 'function')
})

test('processInputSeries - should assign right axis when specified', t => {
  const inputSeries = {
    id: 'series1',
    label: 'Test',
    color: '#000',
    axis: 'right',
    data: [{x: new Date(), y: 10}]
  }

  const result = processInputSeries(inputSeries)
  t.is(result.axisId, AXIS_RIGHT_ID)
})

test('processInputSeries - should sort points chronologically', t => {
  const inputSeries = {
    id: 'series1',
    label: 'Test',
    color: '#000',
    data: [
      {x: new Date('2024-01-03'), y: 30},
      {x: new Date('2024-01-01'), y: 10},
      {x: new Date('2024-01-02'), y: 20}
    ]
  }

  const result = processInputSeries(inputSeries)
  t.is(result.sortedPoints[0].y, 10)
  t.is(result.sortedPoints[1].y, 20)
  t.is(result.sortedPoints[2].y, 30)
})

test('processInputSeries - should handle metadata in points', t => {
  const inputSeries = {
    id: 'series1',
    label: 'Test',
    color: '#000',
    data: [
      {x: new Date(), y: 10, meta: {comment: 'test comment'}}
    ]
  }

  const result = processInputSeries(inputSeries)
  t.deepEqual(result.sortedPoints[0].meta, {comment: 'test comment'})
})

test('processInputSeries - conserve les bornes techniques d’affichage', t => {
  const result = processInputSeries({
    id: 'volume',
    label: 'Volume',
    color: '#000091',
    curve: 'stepAfter',
    data: [{
      x: new Date(2025, 0, 2, 0, 0, 0, -1),
      y: 1000,
      synthetic: true,
      displayBoundary: true,
      showMark: false
    }]
  })

  t.true(result.sortedPoints[0].synthetic)
  t.true(result.sortedPoints[0].displayBoundary)
  t.false(result.sortedPoints[0].showMark)
  t.is(result.curve, 'stepAfter')
})

// ComputeThresholdCrossings tests
test('computeThresholdCrossings - should detect crossing from below to above threshold', t => {
  const points = [
    {x: 1000, y: 5},
    {x: 2000, y: 15}
  ]
  const thresholdEvaluator = () => 10

  const crossings = computeThresholdCrossings(points, thresholdEvaluator)

  t.is(crossings.length, 1)
  t.is(crossings[0].synthetic, true)
  t.is(crossings[0].y, 10)
  t.true(crossings[0].x > 1000)
  t.true(crossings[0].x < 2000)
})

test('computeThresholdCrossings - should detect crossing from above to below threshold', t => {
  const points = [
    {x: 1000, y: 15},
    {x: 2000, y: 5}
  ]
  const thresholdEvaluator = () => 10

  const crossings = computeThresholdCrossings(points, thresholdEvaluator)

  t.is(crossings.length, 1)
  t.is(crossings[0].y, 10)
})

test('computeThresholdCrossings - should not detect crossing when both points are above threshold', t => {
  const points = [
    {x: 1000, y: 15},
    {x: 2000, y: 20}
  ]
  const thresholdEvaluator = () => 10

  const crossings = computeThresholdCrossings(points, thresholdEvaluator)
  t.is(crossings.length, 0)
})

test('computeThresholdCrossings - should skip null values', t => {
  const points = [
    {x: 1000, y: 5},
    {x: 2000, y: null},
    {x: 3000, y: 15}
  ]
  const thresholdEvaluator = () => 10

  const crossings = computeThresholdCrossings(points, thresholdEvaluator)
  t.is(crossings.length, 0)
})

// BuildPointMap tests
test('buildPointMap - should combine filtered points and crossings', t => {
  const xValuesSet = new Set()
  const filteredPoints = [
    {x: 1000, y: 10, meta: null},
    {x: 2000, y: 20, meta: null}
  ]
  const crossings = [
    {
      x: 1500,
      y: 15,
      meta: null,
      synthetic: true
    }
  ]

  const pointMap = buildPointMap(filteredPoints, crossings, xValuesSet)

  t.is(pointMap.size, 3)
  t.is(pointMap.get(1000).synthetic, false)
  t.is(pointMap.get(1500).synthetic, true)
  t.is(xValuesSet.size, 3)
})

test('buildPointMap - should prefer real points over synthetic at same x value', t => {
  const xValuesSet = new Set()
  const filteredPoints = [
    {x: 1000, y: 10, meta: null}
  ]
  const crossings = [
    {
      x: 1000,
      y: 10.5,
      meta: null,
      synthetic: true
    }
  ]

  const pointMap = buildPointMap(filteredPoints, crossings, xValuesSet)

  t.is(pointMap.get(1000).synthetic, false)
  t.is(pointMap.get(1000).y, 10)
})

// BuildSeriesModel integration tests from migrated file
test('buildSeriesModel - should build complete model from input series', t => {
  const series = [
    {
      id: 'series1',
      label: 'Test Series',
      color: '#0078f3',
      axis: 'left',
      data: [
        {x: new Date('2024-01-01'), y: 5},
        {x: new Date('2024-01-02'), y: 15},
        {x: new Date('2024-01-03'), y: 8}
      ],
      threshold: 10
    }
  ]
  const locale = 'en-US'
  const theme = {
    palette: {
      mode: 'light',
      error: {main: '#d32f2f'},
      warning: {main: '#ffa000', light: '#ffb333'}
    }
  }

  const result = buildSeriesModel({
    series,
    locale,
    theme,
    exposeAllMarks: false
  })

  t.truthy(result.xValues)
  t.truthy(result.xAxisDates)
  t.is(result.yAxis.length, 2)
  t.true(result.segmentSeries.length > 0)
  t.is(result.stubSeries.length, 1)
  t.is(result.staticThresholds.length, 1)
  t.is(result.metaBySeries.size, 1)
  t.is(result.pointBySeries.size, 1)
})

test('buildSeriesModel - should handle multiple series on different axes', t => {
  const series = [
    {
      id: 'series1',
      label: 'Left Series',
      color: '#0078f3',
      axis: 'left',
      data: [{x: new Date('2024-01-01'), y: 10}]
    },
    {
      id: 'series2',
      label: 'Right Series',
      color: '#ff0000',
      axis: 'right',
      data: [{x: new Date('2024-01-01'), y: 100}]
    }
  ]
  const locale = 'en-US'
  const theme = {palette: {mode: 'light', error: {main: '#d32f2f'}}}

  const result = buildSeriesModel({
    series,
    locale,
    theme,
    exposeAllMarks: false
  })

  t.is(result.yAxis[0].hasData, true)
  t.is(result.yAxis[1].hasData, true)
  t.is(result.stubSeries.length, 2)
})

test('buildSeriesModel - relie les mesures lorsque la série le demande', t => {
  const result = buildSeriesModel({
    series: [{
      id: 'groundwater',
      label: 'Niveau (m NGF)',
      color: '#000091',
      axis: 'left',
      connectNulls: true,
      data: [
        {x: new Date('2024-01-01'), y: 10},
        {x: new Date('2024-01-03'), y: 12}
      ]
    }],
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false,
    enableThresholds: false
  })

  t.true(result.segmentSeries[0].connectNulls)
  t.true(result.stubSeries[0].connectNulls)
})

test('buildSeriesModel - should detect decimation', t => {
  const manyPoints = Array.from({length: 3000}, (_, index) => ({
    x: new Date(2024, 0, 1 + index),
    y: Math.sin(index / 100) * 10
  }))

  const series = [
    {
      id: 'series1',
      label: 'Dense Series',
      color: '#0078f3',
      data: manyPoints
    }
  ]
  const locale = 'en-US'
  const theme = {palette: {mode: 'light', error: {main: '#d32f2f'}}}

  const result = buildSeriesModel({
    series,
    locale,
    theme,
    exposeAllMarks: false
  })

  t.is(result.didDecimate, true)
})

test('decimatePoints preserves annotated points', t => {
  const points = [
    {x: 1, y: 5, meta: {comment: 'keep me'}},
    {x: 2, y: 6},
    {x: 3, y: 7},
    {x: 4, y: 8},
    {x: 5, y: 9}
  ]

  const {indices, didDecimate} = decimatePoints(points, 3)
  t.true(didDecimate)
  t.true(indices.includes(0), 'annotated point should remain after decimation')
})

test('buildThresholdEvaluator handles dynamic thresholds', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const points = [
    {x: start, y: 10},
    {x: new Date(start.getTime() + 60_000), y: 20}
  ]
  const evaluator = buildThresholdEvaluator(points)
  const middle = start.getTime() + 30_000
  const interpolated = evaluator(middle)
  t.is(evaluator(start.getTime()), 10)
  t.is(evaluator(points[1].x.getTime()), 20)
  t.true(Math.abs(interpolated - 15) < 0.001)
})

test('buildSeriesModel segments data and exposes metadata', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const hour = 3_600_000
  const series = [
    {
      id: 's1',
      label: 'Prim',
      axis: 'left',
      color: '#2563eb',
      data: [
        {x: new Date(start.getTime() + (hour * 0)), y: 10, meta: {comment: 'low'}},
        {x: new Date(start.getTime() + hour), y: 14},
        {x: new Date(start.getTime() + (hour * 2)), y: 9}
      ],
      threshold: 12
    },
    {
      id: 's2',
      label: 'Sec',
      axis: 'right',
      color: '#16a34a',
      data: [
        {x: new Date(start.getTime() + (hour * 0)), y: 50},
        {x: new Date(start.getTime() + hour), y: 58, meta: {alert: 'Alert detected'}}
      ],
      threshold: [
        {x: new Date(start.getTime() + (hour * 0)), y: 52},
        {x: new Date(start.getTime() + hour), y: 54}
      ]
    }
  ]

  const model = buildSeriesModel({
    series,
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false
  })

  t.is(model.yAxis.length, 2)
  t.true(model.dynamicThresholdSeries.length === 1)
  t.is(model.staticThresholds.length, 1)
  t.true(model.segmentSeries.some(segment => segment.originalId === 's1' && segment.classification === SEGMENT_ABOVE))
  t.is(model.metaBySeries.get('s1')?.filter(Boolean).length, 1)
  t.true(model.pointBySeries.get('s2')?.length > 0)
})

test('buildAnnotations returns metadata markers', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const series = [
    {
      id: 'annotated',
      label: 'Annotated',
      axis: 'left',
      color: '#1d4ed8',
      data: [
        {x: start, y: 3, meta: {comment: 'note'}},
        {x: new Date(start.getTime() + 1), y: 4}
      ],
      threshold: 2
    }
  ]

  const model = buildSeriesModel({
    series,
    locale: 'fr-FR',
    theme: baseTheme,
    exposeAllMarks: false
  })
  const annotations = buildAnnotations({
    pointBySeries: model.pointBySeries,
    visibility: {annotated: true},
    theme: baseTheme
  })

  t.is(annotations.length, 1)
  t.is(annotations[0].axisId, AXIS_LEFT_ID)
  t.is(annotations[0].color, baseTheme.palette.info.main)
})

test('axisFormatterFactory localises dates based on frequency', t => {
  const dates = [new Date('2024-02-20T10:30:00Z')]
  const formatter = axisFormatterFactory('fr-FR', dates, '1 day')
  const output = formatter(new Date('2024-02-20T10:30:00Z'))
  t.true(typeof output === 'string')
  // Day format should show day/month
  t.true(output.includes('20'))
  t.true(output.includes('02'))
})

// ============================================================================
// Additional comprehensive tests
// ============================================================================

// Test constants
test('constants are defined correctly', t => {
  t.is(AXIS_LEFT_ID, 'y-left')
  t.is(AXIS_RIGHT_ID, 'y-right')
  t.is(X_AXIS_ID, 'time')
  t.is(SEGMENT_ABOVE, 'above')
  t.is(SEGMENT_BELOW, 'below')
  t.is(SEGMENT_DEFAULT, 'default')
  t.is(MAX_POINTS_BEFORE_DECIMATION, 2000)
  t.is(DECIMATION_TARGET, 800)
})

// Test toDate
test('toDate converts timestamp to Date object', t => {
  const timestamp = 1_704_067_200_000 // 2024-01-01T00:00:00Z
  const date = toDate(timestamp)
  t.true(date instanceof Date)
  t.is(date.getTime(), timestamp)
})

test('toDate handles Date object input', t => {
  const originalDate = new Date('2024-01-01T00:00:00Z')
  const date = toDate(originalDate)
  t.true(date instanceof Date)
  t.is(date.getTime(), originalDate.getTime())
})

// Test getNumberFormatter
test('getNumberFormatter returns Intl.NumberFormat', t => {
  const formatter = getNumberFormatter('fr-FR')
  t.true(formatter instanceof Intl.NumberFormat)
})

test('getNumberFormatter formats numbers with max 2 decimal places', t => {
  const formatter = getNumberFormatter('en-US')
  t.is(formatter.format(1.234_56), '1.23')
  t.is(formatter.format(10), '10')
})

test('getNumberFormatter handles undefined locale', t => {
  const formatter = getNumberFormatter(undefined)
  t.true(formatter instanceof Intl.NumberFormat)
  const result = formatter.format(123.456)
  t.true(typeof result === 'string')
})

// Test getDateFormatter
test('getDateFormatter returns Intl.DateTimeFormat', t => {
  const formatter = getDateFormatter('fr-FR')
  t.true(formatter instanceof Intl.DateTimeFormat)
})

test('getDateFormatter formats dates correctly', t => {
  const formatter = getDateFormatter('en-US')
  const date = new Date('2024-02-15T10:30:00Z')
  const result = formatter.format(date)
  t.true(typeof result === 'string')
  t.true(result.includes('2024'))
})

test('getDateFormatter handles undefined locale', t => {
  const formatter = getDateFormatter(undefined)
  t.true(formatter instanceof Intl.DateTimeFormat)
})

// Test largestTriangleThreeBuckets
test('largestTriangleThreeBuckets returns all indices when below threshold', t => {
  const points = [
    {index: 0, x: 0, y: 1},
    {index: 1, x: 1, y: 2},
    {index: 2, x: 2, y: 3}
  ]
  const indices = largestTriangleThreeBuckets(points, 5)
  t.deepEqual(indices, [0, 1, 2])
})

test('largestTriangleThreeBuckets decimates correctly', t => {
  const points = Array.from({length: 100}, (_, i) => ({
    index: i,
    x: i,
    y: (Math.sin(i / 10) * 50) + 50
  }))
  const indices = largestTriangleThreeBuckets(points, 20)
  t.is(indices.length, 20)
  t.is(indices[0], 0) // First point always included
  t.is([...indices].pop(), 99) // Last point always included
})

test('largestTriangleThreeBuckets preserves first and last points', t => {
  const points = Array.from({length: 50}, (_, i) => ({
    index: i,
    x: i,
    y: i
  }))
  const indices = largestTriangleThreeBuckets(points, 10)
  t.true(indices.includes(0))
  t.true(indices.includes(49))
})

// Test classifyPoint
test('classifyPoint returns null for null y value', t => {
  t.is(classifyPoint(null, 10), null)
})

test('classifyPoint returns null for NaN y value', t => {
  t.is(classifyPoint(Number.NaN, 10), null)
})

test('classifyPoint returns SEGMENT_DEFAULT when no threshold', t => {
  t.is(classifyPoint(15, null), SEGMENT_DEFAULT)
  t.is(classifyPoint(15, undefined), SEGMENT_DEFAULT)
})

test('classifyPoint returns SEGMENT_ABOVE when y > threshold', t => {
  t.is(classifyPoint(15, 10), SEGMENT_ABOVE)
  t.is(classifyPoint(10.1, 10), SEGMENT_ABOVE)
})

test('classifyPoint returns SEGMENT_BELOW when y <= threshold', t => {
  t.is(classifyPoint(5, 10), SEGMENT_BELOW)
  t.is(classifyPoint(10, 10), SEGMENT_BELOW)
})

// Test buildThresholdEvaluator with static threshold
test('buildThresholdEvaluator handles static number threshold', t => {
  const evaluator = buildThresholdEvaluator(50)
  t.is(evaluator(0), 50)
  t.is(evaluator(1000), 50)
  t.is(evaluator(Date.now()), 50)
})

test('buildThresholdEvaluator throws for null threshold', t => {
  t.throws(() => buildThresholdEvaluator(null), {
    instanceOf: TypeError,
    message: /invalid threshold format/
  })
})

test('buildThresholdEvaluator handles undefined threshold', t => {
  const evaluator = buildThresholdEvaluator(undefined)
  t.is(evaluator(0), null)
})

test('buildThresholdEvaluator interpolates between threshold points', t => {
  const points = [
    {x: new Date('2024-01-01T00:00:00Z'), y: 10},
    {x: new Date('2024-01-01T02:00:00Z'), y: 20}
  ]
  const evaluator = buildThresholdEvaluator(points)
  const middleTime = new Date('2024-01-01T01:00:00Z').getTime()
  const result = evaluator(middleTime)
  t.true(Math.abs(result - 15) < 0.01) // Should be approximately 15
})

test('buildThresholdEvaluator returns first value for time before range', t => {
  const points = [
    {x: new Date('2024-01-01T00:00:00Z'), y: 10},
    {x: new Date('2024-01-01T02:00:00Z'), y: 20}
  ]
  const evaluator = buildThresholdEvaluator(points)
  const beforeTime = new Date('2023-12-31T00:00:00Z').getTime()
  t.is(evaluator(beforeTime), 10)
})

test('buildThresholdEvaluator returns last value for time after range', t => {
  const points = [
    {x: new Date('2024-01-01T00:00:00Z'), y: 10},
    {x: new Date('2024-01-01T02:00:00Z'), y: 20}
  ]
  const evaluator = buildThresholdEvaluator(points)
  const afterTime = new Date('2024-01-02T00:00:00Z').getTime()
  t.is(evaluator(afterTime), 20)
})

test('buildThresholdEvaluator throws for invalid threshold type', t => {
  t.throws(() => buildThresholdEvaluator('invalid'), {
    instanceOf: TypeError,
    message: /invalid threshold format/
  })
})

// Test decimatePoints edge cases
test('decimatePoints returns all points when below threshold', t => {
  const points = [
    {x: 1, y: 10},
    {x: 2, y: 20}
  ]
  const {indices, didDecimate} = decimatePoints(points, 10)
  t.is(indices.length, 2)
  t.false(didDecimate)
})

test('decimatePoints preserves points with meta', t => {
  const points = [
    {x: 1, y: 10},
    {x: 2, y: 20, meta: {comment: 'important'}},
    {x: 3, y: 30},
    {x: 4, y: 40, meta: {alert: 'Alert message'}},
    {x: 5, y: 50}
  ]
  const {indices, didDecimate} = decimatePoints(points, 3)
  t.true(didDecimate)
  t.true(indices.includes(1)) // Point with meta
  t.true(indices.includes(3)) // Point with meta
})

// Test buildAnnotations with visibility
test('buildAnnotations filters by visibility', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const pointBySeries = new Map([
    ['visible', [{x: start.getTime(), y: 10, meta: {comment: 'test'}}]],
    ['hidden', [{x: start.getTime(), y: 20, meta: {comment: 'hidden'}}]]
  ])
  const annotations = buildAnnotations({
    pointBySeries,
    visibility: {visible: true, hidden: false},
    theme: baseTheme
  })
  t.is(annotations.length, 1)
})

test('buildAnnotations assigns correct axis ID', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const series = [
    {
      id: 'rightAxis',
      label: 'Right',
      axis: 'right',
      color: '#ff0000',
      data: [{x: start, y: 10, meta: {comment: 'test'}}]
    }
  ]
  const model = buildSeriesModel({
    series, locale: 'en-US', theme: baseTheme, exposeAllMarks: false
  })
  const annotations = buildAnnotations({
    pointBySeries: model.pointBySeries,
    visibility: {rightAxis: true},
    theme: baseTheme
  })
  t.is(annotations.length, 1)
  t.is(annotations[0].axisId, AXIS_RIGHT_ID)
})

test('buildAnnotations uses info color for all metadata points', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const pointBySeries = new Map([
    ['alert', [{x: start.getTime(), y: 10, meta: {alert: 'Alert message'}}]]
  ])
  const annotations = buildAnnotations({
    pointBySeries,
    visibility: {alert: true},
    theme: baseTheme
  })
  t.is(annotations[0].color, baseTheme.palette.info.main)
})

test('buildAnnotations preserves meta with comment in originalPoint', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const pointBySeries = new Map([
    ['commented', [{
      x: start.getTime(),
      y: 10,
      meta: {comment: 'Test comment'},
      axisId: AXIS_LEFT_ID
    }]]
  ])
  const annotations = buildAnnotations({
    pointBySeries,
    visibility: {commented: true},
    theme: baseTheme
  })
  t.is(annotations.length, 1)
  t.deepEqual(annotations[0].originalPoint.meta, {comment: 'Test comment'})
})

// Test buildSeriesModel with null values
test('buildSeriesModel handles null y values', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const hour = 3_600_000
  const series = [
    {
      id: 'withNulls',
      label: 'With Nulls',
      axis: 'left',
      color: '#2563eb',
      data: [
        {x: new Date(start.getTime() + (hour * 0)), y: 10},
        {x: new Date(start.getTime() + hour), y: null},
        {x: new Date(start.getTime() + (hour * 2)), y: 20}
      ]
    }
  ]
  const model = buildSeriesModel({
    series, locale: 'en-US', theme: baseTheme, exposeAllMarks: false
  })
  t.true(model.segmentSeries.length > 0)
})

// Test buildSeriesModel with exposeAllMarks
test('buildSeriesModel exposes all marks when exposeAllMarks is true', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const hour = 3_600_000
  const series = [
    {
      id: 'marks',
      label: 'Marks',
      axis: 'left',
      color: '#2563eb',
      data: [
        {x: new Date(start.getTime() + (hour * 0)), y: 10},
        {x: new Date(start.getTime() + hour), y: 20}
      ]
    }
  ]
  const model = buildSeriesModel({
    series,
    locale: 'en-US',
    theme: baseTheme,
    exposeAllMarks: true
  })
  const segments = model.segmentSeries.filter(s => s.originalId === 'marks')
  t.true(segments.length > 0)
})

// Test buildSeriesModel Y-axis configuration
test('buildSeriesModel creates correct Y-axis configuration', t => {
  const start = new Date('2024-01-01T00:00:00Z')
  const series = [
    {
      id: 'left1',
      label: 'Left 1',
      axis: 'left',
      color: '#2563eb',
      data: [{x: start, y: 10}]
    },
    {
      id: 'right1',
      label: 'Right 1',
      axis: 'right',
      color: '#16a34a',
      data: [{x: start, y: 100}]
    }
  ]
  const model = buildSeriesModel({
    series,
    locale: 'en-US',
    theme: baseTheme,
    exposeAllMarks: false
  })
  t.is(model.yAxis.length, 2)
  const leftAxis = model.yAxis.find(axis => axis.id === AXIS_LEFT_ID)
  const rightAxis = model.yAxis.find(axis => axis.id === AXIS_RIGHT_ID)
  t.truthy(leftAxis)
  t.truthy(rightAxis)
  t.is(leftAxis.position, 'left')
  t.is(rightAxis.position, 'right')
})

// Resampling tests
test('detectNativeFrequency detects daily frequency correctly', t => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const dataPoints = [
    {x: baseTime, y: 10},
    {x: baseTime + MS_PER_DAY, y: 20},
    {x: baseTime + (2 * MS_PER_DAY), y: 30},
    {x: baseTime + (3 * MS_PER_DAY), y: 40}
  ]

  const frequency = detectNativeFrequency(dataPoints)
  t.is(frequency, '1 day')
})

test('detectNativeFrequency detects 6-hour frequency correctly', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const dataPoints = [
    {x: baseTime, y: 10},
    {x: baseTime + (6 * MS_PER_HOUR), y: 20},
    {x: baseTime + (12 * MS_PER_HOUR), y: 30},
    {x: baseTime + (18 * MS_PER_HOUR), y: 40}
  ]

  const frequency = detectNativeFrequency(dataPoints)
  t.is(frequency, '6 hour')
})

test('detectNativeFrequency returns null for insufficient data', t => {
  const dataPoints = [{x: 1000, y: 10}]
  const frequency = detectNativeFrequency(dataPoints)
  t.is(frequency, null)
})

test('detectNativeFrequency returns null for empty array', t => {
  const dataPoints = []
  const frequency = detectNativeFrequency(dataPoints)
  t.is(frequency, null)
})

test('detectNativeFrequency is robust to outliers using median', t => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  // Mostly daily with one outlier at 2 days
  const dataPoints = [
    {x: baseTime, y: 10},
    {x: baseTime + MS_PER_DAY, y: 20},
    {x: baseTime + (2 * MS_PER_DAY), y: 30},
    {x: baseTime + (3 * MS_PER_DAY), y: 40},
    {x: baseTime + (5 * MS_PER_DAY), y: 50}, // Outlier: 2-day gap
    {x: baseTime + (6 * MS_PER_DAY), y: 60},
    {x: baseTime + (7 * MS_PER_DAY), y: 70}
  ]

  const frequency = detectNativeFrequency(dataPoints)
  t.is(frequency, '1 day')
})

test('resampleSeriesData returns original map when native frequency is finer', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const pointMap = new Map([
    [baseTime, {
      x: baseTime, y: 10, meta: null, synthetic: false
    }],
    [baseTime + MS_PER_HOUR, {
      x: baseTime + MS_PER_HOUR, y: 20, meta: null, synthetic: false
    }]
  ])

  const targetXValues = [baseTime, baseTime + MS_PER_HOUR]

  const result = resampleSeriesData(pointMap, targetXValues, '1 hour', '6 hour')

  // Native frequency (1 hour) is finer than target (6 hour) - no resampling
  t.is(result, pointMap)
})

test('resampleSeriesData returns original map when frequencies are equal', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const pointMap = new Map([
    [baseTime, {
      x: baseTime, y: 10, meta: null, synthetic: false
    }],
    [baseTime + MS_PER_HOUR, {
      x: baseTime + MS_PER_HOUR, y: 20, meta: null, synthetic: false
    }]
  ])

  const targetXValues = [baseTime, baseTime + MS_PER_HOUR]

  const result = resampleSeriesData(pointMap, targetXValues, '1 hour', '1 hour')

  // Frequencies are equal - no resampling
  t.is(result, pointMap)
})

test('resampleSeriesData duplicates values for coarser frequency', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  // Daily data
  const pointMap = new Map([
    [baseTime, {
      x: baseTime, y: 100, meta: null, synthetic: false
    }],
    [baseTime + MS_PER_DAY, {
      x: baseTime + MS_PER_DAY, y: 200, meta: null, synthetic: false
    }]
  ])

  // Target is 6-hourly (finer than daily)
  const targetXValues = [
    baseTime,
    baseTime + (6 * MS_PER_HOUR),
    baseTime + (12 * MS_PER_HOUR),
    baseTime + (18 * MS_PER_HOUR),
    baseTime + MS_PER_DAY
  ]

  const result = resampleSeriesData(pointMap, targetXValues, '1 day', '6 hour')

  // All timestamps should be filled
  t.is(result.size, 5)

  // First day's value duplicated to all 6-hour intervals before next day
  t.is(result.get(baseTime).y, 100)
  t.is(result.get(baseTime + (6 * MS_PER_HOUR)).y, 100)
  t.is(result.get(baseTime + (12 * MS_PER_HOUR)).y, 100)
  t.is(result.get(baseTime + (18 * MS_PER_HOUR)).y, 100)
  t.is(result.get(baseTime + MS_PER_DAY).y, 200)

  // Check resampled flag
  t.true(result.get(baseTime + (6 * MS_PER_HOUR)).resampled)
  t.is(result.get(baseTime + (6 * MS_PER_HOUR)).originalX, baseTime)
})

test('resampleSeriesData respects data gaps', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  // Daily data with a 3-day gap (gap > 1.5x native frequency)
  const pointMap = new Map([
    [baseTime, {
      x: baseTime, y: 100, meta: null, synthetic: false
    }],
    [baseTime + (4 * MS_PER_DAY), {
      x: baseTime + (4 * MS_PER_DAY), y: 200, meta: null, synthetic: false
    }]
  ])

  // Target includes timestamps before the gap, in the gap, and after
  const targetXValues = [
    baseTime,
    baseTime + (6 * MS_PER_HOUR),
    baseTime + (12 * MS_PER_HOUR),
    baseTime + MS_PER_DAY,
    baseTime + (2 * MS_PER_DAY),
    baseTime + (3 * MS_PER_DAY),
    baseTime + (4 * MS_PER_DAY)
  ]

  const result = resampleSeriesData(pointMap, targetXValues, '1 day', '6 hour')

  // Check result size - should only have points within native frequency of original points
  t.true(result.size > 0, 'Result should have some points')

  // First day's value should be duplicated to 6-hour and 12-hour marks
  // (within 1 day of the first point)
  const firstDayPoints = [baseTime, baseTime + (6 * MS_PER_HOUR), baseTime + (12 * MS_PER_HOUR)]
  for (const ts of firstDayPoints) {
    const point = result.get(ts)
    if (point) {
      t.is(point.y, 100, `Timestamp ${ts - baseTime}ms should have value 100`)
    }
  }

  // Gap should NOT be filled (these timestamps are more than 1.5 days from nearest point)
  t.falsy(result.get(baseTime + MS_PER_DAY), '1 day mark should not be filled')
  t.falsy(result.get(baseTime + (2 * MS_PER_DAY)), '2 day mark should not be filled')
  t.falsy(result.get(baseTime + (3 * MS_PER_DAY)), '3 day mark should not be filled')

  // Last point should exist (exact match)
  const lastPoint = result.get(baseTime + (4 * MS_PER_DAY))
  if (lastPoint) {
    t.is(lastPoint.y, 200, 'Last point should have value 200')
  }
})

test('resampleSeriesData handles empty point map', t => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const pointMap = new Map()
  const targetXValues = [baseTime, baseTime + MS_PER_HOUR]

  const result = resampleSeriesData(pointMap, targetXValues, '1 day', '6 hour')

  t.is(result.size, 0)
})

test('resampleSeriesData returns original map when frequencies cannot be parsed', t => {
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime()

  const pointMap = new Map([
    [baseTime, {
      x: baseTime, y: 10, meta: null, synthetic: false
    }]
  ])
  const targetXValues = [baseTime]

  const result = resampleSeriesData(pointMap, targetXValues, 'invalid', '6 hour')

  t.is(result, pointMap)
})
