import test from 'ava'

import {
  calculateSelectablePeriodsFromDateRange,
  extractDefaultPeriodsFromDateRange
} from '../date-range-periods.js'

// =============================================================================
// calculateSelectablePeriodsFromDateRange tests
// =============================================================================

test('calculateSelectablePeriodsFromDateRange returns undefined when both dates are null', t => {
  const result = calculateSelectablePeriodsFromDateRange(null, null)
  t.is(result, undefined)
})

test('calculateSelectablePeriodsFromDateRange handles multi-year range', t => {
  const result = calculateSelectablePeriodsFromDateRange('2023-01-01', '2025-12-31')

  t.deepEqual(result.years, [2023, 2024, 2025])
  t.deepEqual(result.months.start, new Date('2023-01-01'))
  t.deepEqual(result.months.end, new Date('2025-12-31'))
})

test('calculateSelectablePeriodsFromDateRange handles single year range', t => {
  const result = calculateSelectablePeriodsFromDateRange('2024-03-15', '2024-11-20')

  t.deepEqual(result.years, [2024])
  t.deepEqual(result.months.start, new Date('2024-03-15'))
  t.deepEqual(result.months.end, new Date('2024-11-20'))
})

test('calculateSelectablePeriodsFromDateRange handles only startDate provided', t => {
  const result = calculateSelectablePeriodsFromDateRange('2024-06-01', null)

  t.truthy(result)
  t.true(result.years.length > 0)
  t.true(result.years.includes(2024))
  t.deepEqual(result.months.start, new Date('2024-06-01'))
  t.deepEqual(result.months.end, new Date(2100, 11, 31))
})

test('calculateSelectablePeriodsFromDateRange handles only endDate provided', t => {
  const result = calculateSelectablePeriodsFromDateRange(null, '2024-08-31')

  t.truthy(result)
  t.true(result.years.length > 0)
  t.true(result.years.includes(2024))
  t.deepEqual(result.months.start, new Date(1900, 0, 1))
  t.deepEqual(result.months.end, new Date('2024-08-31'))
})

test('calculateSelectablePeriodsFromDateRange accepts Date objects', t => {
  const start = new Date(2023, 5, 15) // June 15, 2023
  const end = new Date(2024, 2, 20) // March 20, 2024

  const result = calculateSelectablePeriodsFromDateRange(start, end)

  t.deepEqual(result.years, [2023, 2024])
  t.deepEqual(result.months.start, start)
  t.deepEqual(result.months.end, end)
})

test('calculateSelectablePeriodsFromDateRange handles same day range', t => {
  const result = calculateSelectablePeriodsFromDateRange('2024-07-15', '2024-07-15')

  t.deepEqual(result.years, [2024])
  t.deepEqual(result.months.start, new Date('2024-07-15'))
  t.deepEqual(result.months.end, new Date('2024-07-15'))
})

// =============================================================================
// extractDefaultPeriodsFromDateRange tests
// =============================================================================

test('extractDefaultPeriodsFromDateRange returns undefined when both dates are null', t => {
  const result = extractDefaultPeriodsFromDateRange(null, null)
  t.is(result, undefined)
})

test('extractDefaultPeriodsFromDateRange returns undefined when only startDate provided', t => {
  const result = extractDefaultPeriodsFromDateRange('2024-01-01', null)
  t.is(result, undefined)
})

test('extractDefaultPeriodsFromDateRange returns undefined when only endDate provided', t => {
  const result = extractDefaultPeriodsFromDateRange(null, '2024-12-31')
  t.is(result, undefined)
})

test('extractDefaultPeriodsFromDateRange returns year periods for multi-year range', t => {
  const result = extractDefaultPeriodsFromDateRange('2022-06-01', '2024-09-30')

  t.deepEqual(result, [
    {type: 'year', value: 2022},
    {type: 'year', value: 2023},
    {type: 'year', value: 2024}
  ])
})

test('extractDefaultPeriodsFromDateRange returns month periods for single year', t => {
  const result = extractDefaultPeriodsFromDateRange('2024-03-10', '2024-07-25')

  t.deepEqual(result, [
    {type: 'month', year: 2024, month: 2}, // March (0-indexed)
    {type: 'month', year: 2024, month: 3}, // April
    {type: 'month', year: 2024, month: 4}, // May
    {type: 'month', year: 2024, month: 5}, // June
    {type: 'month', year: 2024, month: 6} // July
  ])
})

test('extractDefaultPeriodsFromDateRange handles same month range', t => {
  const result = extractDefaultPeriodsFromDateRange('2024-05-01', '2024-05-31')

  t.deepEqual(result, [
    {type: 'month', year: 2024, month: 4} // May (0-indexed)
  ])
})

test('extractDefaultPeriodsFromDateRange accepts Date objects', t => {
  const start = new Date(2024, 0, 1) // January 1, 2024
  const end = new Date(2024, 2, 31) // March 31, 2024

  const result = extractDefaultPeriodsFromDateRange(start, end)

  t.deepEqual(result, [
    {type: 'month', year: 2024, month: 0}, // January
    {type: 'month', year: 2024, month: 1}, // February
    {type: 'month', year: 2024, month: 2} // March
  ])
})

test('extractDefaultPeriodsFromDateRange handles year boundary correctly', t => {
  const result = extractDefaultPeriodsFromDateRange('2023-12-01', '2024-01-31')

  // Spans two years, should return year periods
  t.deepEqual(result, [
    {type: 'year', value: 2023},
    {type: 'year', value: 2024}
  ])
})

test('extractDefaultPeriodsFromDateRange handles full year range', t => {
  const result = extractDefaultPeriodsFromDateRange('2024-01-01', '2024-12-31')

  t.is(result.length, 12)
  t.is(result[0].type, 'month')
  t.is(result[0].year, 2024)
  t.is(result[0].month, 0) // January
  t.is(result[11].month, 11) // December
})
