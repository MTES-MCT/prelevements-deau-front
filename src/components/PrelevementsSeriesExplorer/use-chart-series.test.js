import test from 'ava'

import {
  expandCumulativeBucketsForDisplay,
  prepareCumulativeSeriesData,
  shouldRenderCumulativeSeriesAsSteppedLine
} from './use-chart-series.js'

import {buildSeriesModel} from '@/components/ui/TimeSeriesChart/util.js'

const addDays = (date, days) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate() + days
)

const theme = {
  palette: {
    mode: 'light',
    warning: {light: '#fde68a', main: '#f59e0b'},
    error: {main: '#ef4444'},
    info: {main: '#0ea5e9'},
    grey: {400: '#9ca3af'}
  }
}

const buildVolumeModel = data => buildSeriesModel({
  series: [{
    id: 'volume',
    label: 'Volume prélevé (m³)',
    color: '#000091',
    curve: 'stepAfter',
    area: true,
    frequency: '1 day',
    data
  }],
  locale: 'fr-FR',
  theme,
  exposeAllMarks: true,
  timelineFrequency: '1 day'
})

test('a cumulative series uses a stepped line', t => {
  const volume = {unit: 'm³', valueType: 'cumulative'}

  t.true(shouldRenderCumulativeSeriesAsSteppedLine(volume))
})

test('opposite cumulative flows sharing an axis both use stepped lines', t => {
  const withdrawn = {unit: 'm³', valueType: 'cumulative'}
  const discharged = {unit: 'm³', valueType: 'cumulative'}

  t.true(shouldRenderCumulativeSeriesAsSteppedLine(withdrawn))
  t.true(shouldRenderCumulativeSeriesAsSteppedLine(discharged))
})

test('instantaneous index series keep their regular line', t => {
  const index = {unit: 'm³', valueType: 'instantaneous'}

  t.false(shouldRenderCumulativeSeriesAsSteppedLine(index))
})

test('12 isolated daily volumes become 12 one-day plateaus without visible marks', t => {
  const points = Array.from({length: 12}, (_, index) => {
    const start = new Date(2025, index, 1)
    return {
      x: start,
      y: (index + 1) * 1000,
      meta: {comment: `Volume ${index + 1}`},
      bucketEnd: addDays(start, 1)
    }
  })

  const prepared = prepareCumulativeSeriesData(points, '1 day')
  const runs = []
  let currentRun = []

  for (const point of prepared) {
    if (point.y === null) {
      if (currentRun.length > 0) {
        runs.push(currentRun)
        currentRun = []
      }

      continue
    }

    currentRun.push(point)
  }

  if (currentRun.length > 0) {
    runs.push(currentRun)
  }

  t.is(runs.length, 12)
  t.true(runs.every(run => run.length === 2))
  t.true(runs.every(run => run[1].x - run[0].x === (24 * 60 * 60 * 1000) - 1))
  t.true(prepared.every(point => point.showMark === false))
  t.true(runs.every(run => run[1].synthetic && run[1].displayBoundary))
  t.true(runs.every(run => run[1].meta === null))
  t.true(runs.every(run => run[1].tooltipDate.getTime() === run[0].x.getTime()))
  t.true(runs.every(run => run[1].tooltipMeta?.comment === run[0].meta.comment))

  const model = buildVolumeModel(prepared)
  t.is(model.segmentSeries.length, 12)
  t.true(model.segmentSeries.every(segment => segment.curve === 'stepAfter'))
  t.true(model.segmentSeries.every(segment => segment.area && !segment.stack))
  t.true(model.segmentSeries.every(segment => (
    segment.data.filter(value => Number.isFinite(value)).length === 2
  )))
})

test('337 consecutive daily volumes form one continuous stepped line', t => {
  const start = new Date(2024, 11, 1)
  const points = Array.from({length: 337}, (_, index) => {
    const bucketStart = addDays(start, index)
    return {
      x: bucketStart,
      y: 1000,
      meta: null,
      bucketEnd: addDays(bucketStart, 1)
    }
  })

  const expanded = expandCumulativeBucketsForDisplay(points, '1 day')
  const prepared = prepareCumulativeSeriesData(points, '1 day')

  t.is(expanded.length, 338)
  t.is(expanded.filter(point => point.displayBoundary).length, 1)
  t.is(prepared.filter(point => point.y === null).length, 0)
  t.true(prepared.every(point => point.showMark === false))

  const model = buildVolumeModel(prepared)
  t.is(model.segmentSeries.length, 1)
  t.is(model.segmentSeries[0].curve, 'stepAfter')
  t.true(model.segmentSeries[0].area)
  t.is(model.segmentSeries[0].data.filter(value => Number.isFinite(value)).length, 338)
})

test('a missing cumulative bucket remains an unfilled gap', t => {
  const firstDay = new Date(2025, 0, 1)
  const thirdDay = addDays(firstDay, 2)
  const prepared = prepareCumulativeSeriesData([
    {x: firstDay, y: 1000, bucketEnd: addDays(firstDay, 1)},
    {x: thirdDay, y: 2000, bucketEnd: addDays(thirdDay, 1)}
  ], '1 day')

  const gap = prepared.find(point => point.y === null)
  t.truthy(gap)
  t.is(gap.x.getTime(), addDays(firstDay, 1).getTime())
  t.true(gap.synthetic)
  t.true(gap.displayBoundary)

  const model = buildVolumeModel(prepared)
  t.is(model.segmentSeries.length, 2)
  t.true(model.segmentSeries.every(segment => segment.area))
  t.true(model.segmentSeries.every(segment => (
    segment.data.filter(value => Number.isFinite(value)).length === 2
  )))
})
