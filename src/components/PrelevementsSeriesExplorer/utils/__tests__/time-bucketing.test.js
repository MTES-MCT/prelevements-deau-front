import test from 'ava'

import {
  RESOLUTIONS,
  aggregateSeriesIntoBuckets,
  bucketSeriesCollection,
  chooseDisplayResolution,
  chooseSeriesBucketResolution,
  floorToBucket,
  resolutionFromFrequency,
  resolutionToFrequency
} from '../time-bucketing.js'

test('chooseDisplayResolution adapts to range length and width', t => {
  const start = new Date('2024-01-01T00:00:00')
  const end = new Date('2024-01-02T00:00:00')
  const resolutionDay = chooseDisplayResolution(start, end, 1200)
  t.is(resolutionDay, '15m') // Short range sticks to finest resolution

  const longStart = new Date('2024-01-01T00:00:00')
  const longEnd = new Date('2024-07-01T00:00:00')
  const resolutionLong = chooseDisplayResolution(longStart, longEnd, 1200)
  t.is(resolutionLong, '1d') // Long range switches to daily buckets
})

test('chooseSeriesBucketResolution never goes finer than native resolution', t => {
  t.is(chooseSeriesBucketResolution('15m', '1h'), '1h')
  t.is(chooseSeriesBucketResolution('1d', '15m'), '1d')
  t.is(chooseSeriesBucketResolution('1Q', '6M'), '6M')
})

test('floorToBucket floors dates correctly for calendar-based resolutions', t => {
  const date = new Date(Date.UTC(2024, 4, 17, 10, 23, 0))
  t.is(floorToBucket(date, '15m')?.toISOString(), '2024-05-17T10:15:00.000Z')
  t.is(floorToBucket(date, '1h')?.toISOString(), '2024-05-17T10:00:00.000Z')
  const dayBucket = floorToBucket(date, '1d')
  t.is(dayBucket?.getFullYear(), 2024)
  t.is(dayBucket?.getMonth(), 4)
  t.is(dayBucket?.getDate(), 17)
  t.is(dayBucket?.getHours(), 0)

  const quarterBucket = floorToBucket(date, '1Q')
  t.is(quarterBucket?.getMonth(), 3) // April (0-indexed)
  t.is(quarterBucket?.getDate(), 1)

  const semesterBucket = floorToBucket(date, '6M')
  t.is(semesterBucket?.getMonth(), 0)
  t.is(semesterBucket?.getDate(), 1)

  const yearBucket = floorToBucket(date, '1Y')
  t.is(yearBucket?.getFullYear(), 2024)
  t.is(yearBucket?.getMonth(), 0)
  t.is(yearBucket?.getDate(), 1)
})

test('aggregateSeriesIntoBuckets averages instant metrics and preserves min/max', t => {
  const points = [
    {t: new Date('2024-01-01T00:00:00'), value: 2},
    {t: new Date('2024-01-01T00:10:00'), value: 4},
    {t: new Date('2024-01-01T00:20:00'), value: 6}
  ]

  const aggregated = aggregateSeriesIntoBuckets(points, {
    bucketResolution: '15m',
    kind: 'instant'
  })

  t.is(aggregated.length, 2)
  t.is(aggregated[0].value, 3) // (2 + 4) / 2
  t.is(aggregated[0].min, 2)
  t.is(aggregated[0].max, 4)
  t.is(aggregated[1].value, 6)
})

test('aggregateSeriesIntoBuckets sums cumulative metrics', t => {
  const points = [
    {t: new Date('2024-01-01T00:00:00'), value: 1},
    {t: new Date('2024-01-01T00:30:00'), value: 2},
    {t: new Date('2024-01-01T01:00:00'), value: 3}
  ]

  const aggregated = aggregateSeriesIntoBuckets(points, {
    bucketResolution: '1h',
    kind: 'cumulative'
  })

  t.is(aggregated.length, 2)
  t.is(aggregated[0].value, 3) // 1 + 2 within first hour
  t.is(aggregated[1].value, 3)
})

test('bucketSeriesCollection picks display resolution and respects native resolution per series', t => {
  const start = new Date('2024-01-01T00:00:00')
  const end = new Date('2024-01-10T00:00:00')

  const fastSeries = {
    id: 'fast',
    meta: {nativeResolution: '15m', kind: 'instant'},
    data: [
      {t: start, value: 1},
      {t: new Date('2024-01-01T00:30:00'), value: 3},
      {t: new Date('2024-01-02T02:00:00'), value: 2}
    ]
  }

  const slowSeries = {
    id: 'slow',
    meta: {nativeResolution: '1d', kind: 'cumulative'},
    data: [
      {t: new Date('2024-01-01T00:00:00'), value: 5},
      {t: new Date('2024-01-02T00:00:00'), value: 7}
    ]
  }

  const {bucketedSeries, displayResolution} = bucketSeriesCollection(
    [fastSeries, slowSeries],
    {start, end},
    1200
  )

  t.is(displayResolution, '1h') // ~9 days on 1200px -> hourly target

  const fastResult = bucketedSeries.find(item => item.id === 'fast')
  const slowResult = bucketedSeries.find(item => item.id === 'slow')

  t.truthy(fastResult)
  t.truthy(slowResult)
  t.is(fastResult.bucketResolution, '1h')
  t.is(slowResult.bucketResolution, '1d')
  t.true(fastResult.data.length <= fastSeries.data.length)
  t.true(slowResult.data.length <= slowSeries.data.length)
})

test('frequency helpers convert between frequency strings and resolutions', t => {
  t.is(resolutionFromFrequency('15 minutes'), '15m')
  t.is(resolutionFromFrequency('1 quarter'), '1Q')
  t.is(resolutionFromFrequency('6 months'), '6M')
  t.is(resolutionFromFrequency('1 year'), '1Y')

  t.is(resolutionToFrequency('1h'), '1 hour')
  t.is(resolutionToFrequency(RESOLUTIONS[0].id), '15 minutes')
})
