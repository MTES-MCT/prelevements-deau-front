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
  // 1 day range with 1200px width
  // maxPoints = max(12, 1200/15) = 80
  // targetBucketMs = 1 day / 80 = ~18 minutes -> picks 1h
  const start = new Date('2024-01-01T00:00:00')
  const end = new Date('2024-01-02T00:00:00')
  const resolutionDay = chooseDisplayResolution(start, end, 1200)
  t.is(resolutionDay, '1h') // 1 day range with 80 target points -> hourly resolution

  // 10 months range with standard width should prefer monthly resolution
  // maxPoints = 80, targetBucketMs = 300 days / 80 = ~3.75 days -> picks 1M
  const longStart = new Date('2024-01-01T00:00:00')
  const longEnd = new Date('2024-11-01T00:00:00')
  const resolutionLong = chooseDisplayResolution(longStart, longEnd, 1200)
  t.is(resolutionLong, '1M') // ~10 months prefers monthly buckets for readability
})

test('chooseDisplayResolution excludes month resolution for ranges <= 3 months', t => {
  // 2 months range - should not use month resolution
  const start2m = new Date('2024-01-01T00:00:00')
  const end2m = new Date('2024-03-01T00:00:00')
  const resolution2m = chooseDisplayResolution(start2m, end2m, 50) // Small width to force coarse resolution
  t.not(resolution2m, '1M') // Month should not be available

  // 6 months range - should allow month resolution
  const start6m = new Date('2024-01-01T00:00:00')
  const end6m = new Date('2024-07-01T00:00:00')
  const resolution6m = chooseDisplayResolution(start6m, end6m, 50)
  // With 6 months and small width, month could be selected
  t.true(['1d', '1M'].includes(resolution6m))
})

test('chooseDisplayResolution excludes quarter resolution for ranges <= 9 months', t => {
  // 6 months range - should not use quarter resolution
  const start6m = new Date('2024-01-01T00:00:00')
  const end6m = new Date('2024-07-01T00:00:00')
  const resolution6m = chooseDisplayResolution(start6m, end6m, 50) // Small width to force coarse resolution
  t.not(resolution6m, '1Q') // Quarter should not be available

  // 12 months range - should allow quarter resolution
  // maxPoints = max(12, 50/15) = 12, targetBucketMs = 365 days / 12 = ~30 days -> picks 1Q (90 days)
  const start12m = new Date('2024-01-01T00:00:00')
  const end12m = new Date('2025-01-01T00:00:00')
  const resolution12m = chooseDisplayResolution(start12m, end12m, 50)
  t.is(resolution12m, '1Q') // Quarter resolution expected for 12 months with small width
})

test('chooseDisplayResolution excludes year resolution for ranges <= 3 years', t => {
  // 2 years range - should not use year resolution
  const start2y = new Date('2022-01-01T00:00:00')
  const end2y = new Date('2024-01-01T00:00:00')
  const resolution2y = chooseDisplayResolution(start2y, end2y, 10) // Very small width to force coarse resolution
  t.not(resolution2y, '1Y') // Year should not be available

  // 5 years range - should allow year resolution
  const start5y = new Date('2019-01-01T00:00:00')
  const end5y = new Date('2024-01-01T00:00:00')
  const resolution5y = chooseDisplayResolution(start5y, end5y, 10) // Very small width
  // 1Q or 1Y are valid for 5 years with very small width
  t.true(['1Q', '1Y'].includes(resolution5y))
})

test('chooseSeriesBucketResolution never goes finer than native resolution', t => {
  t.is(chooseSeriesBucketResolution('15m', '1h'), '1h')
  t.is(chooseSeriesBucketResolution('1d', '15m'), '1d')
  t.is(chooseSeriesBucketResolution('1M', '1Q'), '1Q')
})

test('floorToBucket floors dates correctly for calendar-based resolutions', t => {
  const date = new Date(Date.UTC(2024, 4, 17, 10, 23, 0))
  t.is(floorToBucket(date, '15m')?.toISOString(), '2024-05-17T10:15:00.000Z')
  t.is(floorToBucket(date, '1h')?.toISOString(), '2024-05-17T10:00:00.000Z')

  // Test 6h bucket with a local date to avoid timezone issues
  const localDate = new Date(2024, 4, 17, 10, 23, 0) // 10:23 local time
  const hour6Bucket = floorToBucket(localDate, '6h')
  t.is(hour6Bucket?.getFullYear(), 2024)
  t.is(hour6Bucket?.getMonth(), 4)
  t.is(hour6Bucket?.getDate(), 17)
  t.is(hour6Bucket?.getHours(), 6) // 10:23 floors to 6:00 (6h block: 0, 6, 12, 18)

  const dayBucket = floorToBucket(date, '1d')
  t.is(dayBucket?.getFullYear(), 2024)
  t.is(dayBucket?.getMonth(), 4)
  t.is(dayBucket?.getDate(), 17)
  t.is(dayBucket?.getHours(), 0)

  const monthBucket = floorToBucket(date, '1M')
  t.is(monthBucket?.getFullYear(), 2024)
  t.is(monthBucket?.getMonth(), 4) // May (0-indexed)
  t.is(monthBucket?.getDate(), 1)
  t.is(monthBucket?.getHours(), 0)

  const quarterBucket = floorToBucket(date, '1Q')
  t.is(quarterBucket?.getMonth(), 3) // April (0-indexed)
  t.is(quarterBucket?.getDate(), 1)

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

  // ~9 days on 1200px with new settings:
  // maxPoints = max(12, 1200/15) = 80
  // targetBucketMs = 9 days / 80 = ~2.7 hours -> picks 6h
  t.is(displayResolution, '6h')

  const fastResult = bucketedSeries.find(item => item.id === 'fast')
  const slowResult = bucketedSeries.find(item => item.id === 'slow')

  t.truthy(fastResult)
  t.truthy(slowResult)
  t.is(fastResult.bucketResolution, '6h') // Uses display resolution (6h > 15m native)
  t.is(slowResult.bucketResolution, '1d') // Uses native resolution (1d > 6h display)
  t.true(fastResult.data.length <= fastSeries.data.length)
  t.true(slowResult.data.length <= slowSeries.data.length)
})

test('frequency helpers convert between frequency strings and resolutions', t => {
  t.is(resolutionFromFrequency('15 minutes'), '15m')
  t.is(resolutionFromFrequency('6 hours'), '6h')
  t.is(resolutionFromFrequency('1 quarter'), '1Q')
  t.is(resolutionFromFrequency('1 year'), '1Y')

  t.is(resolutionToFrequency('1h'), '1 hour')
  t.is(resolutionToFrequency('6h'), '6 hours')
  t.is(resolutionToFrequency(RESOLUTIONS[0].id), '15 minutes')
})

test('aggregateSeriesIntoBuckets merges metadata comments within a bucket', t => {
  const points = [
    {t: new Date('2024-01-01T00:00:00'), value: 2, meta: {comment: 'Estimation'}},
    {t: new Date('2024-01-01T00:10:00'), value: 4, meta: {comment: 'Capteur'}},
    {t: new Date('2024-01-01T00:20:00'), value: 6, meta: {comment: 'Estimation'}}
  ]

  const aggregated = aggregateSeriesIntoBuckets(points, {
    bucketResolution: '15m',
    kind: 'instant'
  })

  t.is(aggregated[0].meta?.comment, 'Estimation • Capteur')
})
