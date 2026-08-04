import test from 'ava'

import {
  aggregationDateOverlapsRange,
  clampAggregationDateToRange,
  parseAggregationDate
} from '../aggregation-date.js'

const localIsoDate = date => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-')

test('parseAggregationDate parses ISO week labels from their Monday', t => {
  t.is(localIsoDate(parseAggregationDate('2025-W01')), '2024-12-30')
  t.is(localIsoDate(parseAggregationDate('2026-W01')), '2025-12-29')
})

test('aggregationDateOverlapsRange keeps a partial ISO week at a range boundary', t => {
  const range = {
    start: new Date(2024, 11, 1),
    end: new Date(2024, 11, 31)
  }

  t.true(aggregationDateOverlapsRange('2024-W48', range))
  t.false(aggregationDateOverlapsRange('2024-W47', range))
})

test('clampAggregationDateToRange places a partial bucket on the first visible day', t => {
  const range = {
    start: new Date(2024, 11, 1),
    end: new Date(2024, 11, 31)
  }

  t.is(localIsoDate(clampAggregationDateToRange('2024-W48', range)), '2024-12-01')
  t.is(localIsoDate(clampAggregationDateToRange('2024-W49', range)), '2024-12-02')
})
