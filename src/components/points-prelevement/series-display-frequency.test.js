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

test('resolveInitialDisplayFrequency chooses a monthly frequency for multi-year ranges', t => {
  t.is(
    resolveInitialDisplayFrequency({
      startDate: '2021-10-12',
      endDate: '2026-07-08'
    }),
    '1 month'
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
  t.is(normalizeSeriesDisplayFrequency('1 month'), '1 month')
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

test('resolveSeriesDisplayFrequency can follow finer suggestions down to the daily frequency', t => {
  t.is(
    resolveSeriesDisplayFrequency({
      startDate: '2021-10-12',
      endDate: '2026-07-08',
      suggestedFrequency: '1 hour'
    }),
    DEFAULT_SERIES_DISPLAY_FREQUENCY
  )
})
