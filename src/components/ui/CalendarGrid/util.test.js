import test from 'ava'

import {computeCalendarKey} from './util.js'

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

