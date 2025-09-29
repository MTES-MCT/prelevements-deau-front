import test from 'ava'

import {
  computeCalendarKey,
  validateCalendars,
  getMinDate
} from './util.js'

// Helper dataset factory
function makeValues(dates) {
  return dates.map(d => ({date: d}))
}

test('returns cal-empty for empty array', t => {
  t.is(computeCalendarKey([]), 'cal-empty')
})

test('returns cal-empty when argument is not an array', t => {
  t.is(computeCalendarKey(null), 'cal-empty')
  t.is(computeCalendarKey(undefined), 'cal-empty')
  t.is(computeCalendarKey({}), 'cal-empty')
})

test('concatenates dates with a pipe', t => {
  const values = makeValues(['2024-01-01', '2024-01-02', '2024-01-03'])
  t.is(computeCalendarKey(values), '2024-01-01|2024-01-02|2024-01-03')
})

test('is stable for same content (new object references)', t => {
  const dates = ['2024-05-10', '2024-05-11']
  const valuesA = makeValues(dates)
  const valuesB = makeValues(dates) // New objects, same dates
  t.is(computeCalendarKey(valuesA), computeCalendarKey(valuesB))
})

test('different order yields a different key (order significant)', t => {
  const a = makeValues(['2024-02-01', '2024-02-02'])
  const b = makeValues(['2024-02-02', '2024-02-01'])
  t.not(computeCalendarKey(a), computeCalendarKey(b))
})

test('handles duplicate dates explicitly', t => {
  const values = makeValues(['2024-03-01', '2024-03-01', '2024-03-02'])
  t.is(computeCalendarKey(values), '2024-03-01|2024-03-01|2024-03-02')
})

test('handles objects missing date by producing empty segment tokens', t => {
  const values = [{date: '2024-04-01'}, {foo: 'bar'}, {date: '2024-04-03'}]
  // Join() turns undefined into '' -> empty segment between pipes
  t.is(computeCalendarKey(values), '2024-04-01||2024-04-03')
})

test('multiple missing dates produce multiple empty segments', t => {
  const values = [{foo: 'x'}, {date: '2024-06-01'}, {}, {date: '2024-06-03'}, {bar: 'y'}]
  t.is(computeCalendarKey(values), '|2024-06-01||2024-06-03|')
})

// -------------------------------
// validateCalendars tests
// -------------------------------

test('validateCalendars ok for null / undefined (treated as empty)', t => {
  t.deepEqual(validateCalendars(null), {ok: true, problems: []})
  t.deepEqual(validateCalendars(undefined), {ok: true, problems: []})
})

test('validateCalendars rejects non-array root', t => {
  const res = validateCalendars({})
  t.false(res.ok)
  t.true(res.problems.some(p => p.includes('not an array')))
})

test('validateCalendars detects non-array sub element', t => {
  const res = validateCalendars([[{date: '2024-01-01'}], 42])
  t.false(res.ok)
  t.true(res.problems.some(p => p.includes('is not an array')))
})

test('validateCalendars detects missing date property', t => {
  const res = validateCalendars([[{foo: 'bar'}]])
  t.false(res.ok)
  t.true(res.problems[0].includes('date is missing'))
})

test('validateCalendars detects empty date string', t => {
  const res = validateCalendars([[{date: '   '}]])
  t.false(res.ok)
  t.true(res.problems[0].includes('missing or not a string'))
})

test('validateCalendars detects unparsable date string', t => {
  const res = validateCalendars([[{date: 'not-a-date'}]])
  t.false(res.ok)
  t.true(res.problems[0].includes('not a parseable date'))
})

test('validateCalendars aggregates multiple problems', t => {
  const res = validateCalendars([
    [{date: 'bad-date'}, {foo: 'x'}],
    'oops'
  ])
  t.false(res.ok)
  t.true(res.problems.length >= 2)
})

test('validateCalendars ok for valid structure', t => {
  const res = validateCalendars([
    [
      {date: '2024-01-01'},
      {date: '2024-01-02'}
    ],
    [
      {date: '2025-05-10'}
    ]
  ])
  t.true(res.ok)
  t.deepEqual(res.problems, [])
})

// -------------------------------
// getMinDate tests (core earliest date logic)
// -------------------------------

test('getMinDate returns null for null/undefined/not array', t => {
  t.is(getMinDate(null), null)
  t.is(getMinDate(undefined), null)
  t.is(getMinDate({}), null)
})

test('getMinDate returns null for empty array', t => {
  t.is(getMinDate([]), null)
})

test('getMinDate ignores entries without date or with invalid date', t => {
  const values = [
    {foo: 'x'},
    {date: 'invalid-date'},
    {date: '2024-03-05'},
    {date: '2024-02-01'}
  ]
  t.is(getMinDate(values), '2024-02-01')
})

test('getMinDate returns earliest date (unordered input)', t => {
  const values = [
    {date: '2024-12-31'},
    {date: '2024-01-01'},
    {date: '2024-06-15'}
  ]
  t.is(getMinDate(values), '2024-01-01')
})

test('getMinDate returns null when all dates invalid', t => {
  const values = [
    {date: 'bad'},
    {date: ''},
    {foo: 'bar'}
  ]
  t.is(getMinDate(values), null)
})

test('getMinDate handles single valid date', t => {
  t.is(getMinDate([{date: '2025-07-09'}]), '2025-07-09')
})

