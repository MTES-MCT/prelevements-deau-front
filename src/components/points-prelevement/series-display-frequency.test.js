import test from 'ava'

import {
  DEFAULT_SERIES_DISPLAY_FREQUENCY,
  normalizeSeriesDisplayFrequency,
  resolveInitialDisplayFrequency,
  resolveSeriesDisplayFrequency
} from './series-display-frequency.js'

test('resolveInitialDisplayFrequency returns the default frequency when the range is missing or invalid', t => {
  t.is(resolveInitialDisplayFrequency(), DEFAULT_SERIES_DISPLAY_FREQUENCY)
  t.is(
    resolveInitialDisplayFrequency({
      startDate: '2026-01-01',
      endDate: '2026-01-01'
    }),
    DEFAULT_SERIES_DISPLAY_FREQUENCY
  )
})

test('resolveInitialDisplayFrequency chooses a weekly frequency before jumping to monthly', t => {
  t.is(
    resolveInitialDisplayFrequency({
      startDate: '2021-10-12',
      endDate: '2026-07-08'
    }),
    '1 week'
  )
})

test('resolveInitialDisplayFrequency keeps the daily frequency for a few months of data', t => {
  t.is(
    resolveInitialDisplayFrequency({
      startDate: '2026-03-01',
      endDate: '2026-07-01'
    }),
    DEFAULT_SERIES_DISPLAY_FREQUENCY
  )
})

test('resolveInitialDisplayFrequency uses weekly buckets around one year even on a wide chart', t => {
  const range = {
    startDate: '2025-01-01',
    endDate: '2026-01-01'
  }

  t.is(resolveInitialDisplayFrequency({...range, widthPx: 1200}), '1 week')
  t.is(resolveInitialDisplayFrequency({...range, widthPx: 2400}), '1 week')
})

test('resolveInitialDisplayFrequency limits daily bucket count according to chart width', t => {
  const startDate = '2025-01-01'

  // A regular chart caps the daily view at 200 buckets.
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2025-07-20', widthPx: 1200}), '1 day')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2025-07-21', widthPx: 1200}), '1 week')

  // On a narrow chart, the existing 180-point density floor applies.
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2025-06-30', widthPx: 540}), '1 day')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2025-07-01', widthPx: 540}), '1 week')
})

test('resolveInitialDisplayFrequency still avoids too many points on very long narrow ranges', t => {
  t.is(
    resolveInitialDisplayFrequency({
      startDate: '2006-01-01',
      endDate: '2026-01-01',
      widthPx: 200
    }),
    '1 quarter'
  )
})

test('normalizeSeriesDisplayFrequency does not go below the daily frequency', t => {
  t.is(normalizeSeriesDisplayFrequency('15 minutes'), DEFAULT_SERIES_DISPLAY_FREQUENCY)
  t.is(normalizeSeriesDisplayFrequency('1 hour'), DEFAULT_SERIES_DISPLAY_FREQUENCY)
  t.is(normalizeSeriesDisplayFrequency('6 hours'), DEFAULT_SERIES_DISPLAY_FREQUENCY)
  t.is(normalizeSeriesDisplayFrequency('1 week'), '1 week')
  t.is(normalizeSeriesDisplayFrequency('1 month'), '1 month')
})

test('resolveInitialDisplayFrequency follows day, week, month and quarter thresholds', t => {
  const startDate = '2000-01-01'
  const widthPx = 540 // Minimum target of 180 points

  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2000-06-29', widthPx}), '1 day')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2001-01-01', widthPx}), '1 week')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2003-01-01', widthPx}), '1 week')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2008-01-01', widthPx}), '1 month')
  t.is(resolveInitialDisplayFrequency({startDate, endDate: '2020-01-01', widthPx}), '1 quarter')
})

test('resolveSeriesDisplayFrequency ignores automatic suggestions that are too coarse for the range', t => {
  t.is(
    resolveSeriesDisplayFrequency({
      startDate: '2026-03-01',
      endDate: '2026-07-01',
      suggestedFrequency: '1 month'
    }),
    DEFAULT_SERIES_DISPLAY_FREQUENCY
  )
})

test('resolveSeriesDisplayFrequency lets a short slider zoom refine a yearly view to daily data', t => {
  t.is(
    resolveSeriesDisplayFrequency({
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      suggestedFrequency: '1 hour'
    }),
    DEFAULT_SERIES_DISPLAY_FREQUENCY
  )
})

test('resolveSeriesDisplayFrequency keeps the weekly resolution suggested for a full year', t => {
  t.is(
    resolveSeriesDisplayFrequency({
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      suggestedFrequency: '1 week'
    }),
    '1 week'
  )
})
