import test from 'ava'

import {
  FREQUENCY_LABELS,
  FREQUENCY_ORDER,
  formatFrequencyLabel,
  getFrequencyOrder,
  sortFrequencies
} from '../frequency.js'

// FREQUENCY_LABELS tests
test('FREQUENCY_LABELS contains all expected frequency mappings', t => {
  t.is(FREQUENCY_LABELS.size, 5)
  t.is(FREQUENCY_LABELS.get('1 second'), '1 seconde')
  t.is(FREQUENCY_LABELS.get('1 minute'), '1 minute')
  t.is(FREQUENCY_LABELS.get('15 minutes'), '15 minutes')
  t.is(FREQUENCY_LABELS.get('1 hour'), '1 heure')
  t.is(FREQUENCY_LABELS.get('1 day'), '1 jour')
})

// FREQUENCY_ORDER tests
test('FREQUENCY_ORDER has correct ordering from smallest to largest interval', t => {
  t.is(FREQUENCY_ORDER['1 second'], 1)
  t.is(FREQUENCY_ORDER['1 minute'], 2)
  t.is(FREQUENCY_ORDER['15 minutes'], 3)
  t.is(FREQUENCY_ORDER['1 hour'], 4)
  t.is(FREQUENCY_ORDER['1 day'], 5)
})

test('FREQUENCY_ORDER maintains ascending order', t => {
  const values = Object.values(FREQUENCY_ORDER)
  const sorted = [...values].sort((a, b) => a - b)
  t.deepEqual(values, sorted)
})

// FormatFrequencyLabel tests
test('formatFrequencyLabel formats known frequencies to French labels', t => {
  t.is(formatFrequencyLabel('1 second'), '1 seconde')
  t.is(formatFrequencyLabel('1 minute'), '1 minute')
  t.is(formatFrequencyLabel('15 minutes'), '15 minutes')
  t.is(formatFrequencyLabel('1 hour'), '1 heure')
  t.is(formatFrequencyLabel('1 day'), '1 jour')
})

test('formatFrequencyLabel returns original value for unknown frequencies', t => {
  t.is(formatFrequencyLabel('unknown'), 'unknown')
  t.is(formatFrequencyLabel('2 hours'), '2 hours')
})

test('formatFrequencyLabel handles null and undefined', t => {
  t.is(formatFrequencyLabel(null), null)
  t.is(formatFrequencyLabel(undefined), null)
  t.is(formatFrequencyLabel(''), null)
})

// GetFrequencyOrder tests
test('getFrequencyOrder returns correct order for known frequencies', t => {
  t.is(getFrequencyOrder('1 second'), 1)
  t.is(getFrequencyOrder('1 minute'), 2)
  t.is(getFrequencyOrder('15 minutes'), 3)
  t.is(getFrequencyOrder('1 hour'), 4)
  t.is(getFrequencyOrder('1 day'), 5)
})

test('getFrequencyOrder returns 999 for unknown frequencies', t => {
  t.is(getFrequencyOrder('unknown'), 999)
  t.is(getFrequencyOrder('2 hours'), 999)
  t.is(getFrequencyOrder(null), 999)
  t.is(getFrequencyOrder(undefined), 999)
})

// SortFrequencies tests
test('sortFrequencies sorts frequencies in ascending order (most to least frequent)', t => {
  const unsorted = ['1 day', '1 second', '1 hour', '15 minutes', '1 minute']
  const expected = ['1 second', '1 minute', '15 minutes', '1 hour', '1 day']
  t.deepEqual(sortFrequencies(unsorted), expected)
})

test('sortFrequencies handles empty array', t => {
  t.deepEqual(sortFrequencies([]), [])
})

test('sortFrequencies handles single element', t => {
  t.deepEqual(sortFrequencies(['1 day']), ['1 day'])
})

test('sortFrequencies places unknown frequencies at the end', t => {
  const unsorted = ['1 day', 'unknown', '1 second', 'custom']
  const sorted = sortFrequencies(unsorted)

  t.is(sorted[0], '1 second')
  t.is(sorted[1], '1 day')
  t.true(sorted.slice(2).includes('unknown'))
  t.true(sorted.slice(2).includes('custom'))
})

test('sortFrequencies does not mutate original array', t => {
  const original = ['1 day', '1 second', '1 hour']
  const originalCopy = [...original]
  sortFrequencies(original)

  t.deepEqual(original, originalCopy)
})

test('sortFrequencies handles duplicates', t => {
  const unsorted = ['1 day', '1 second', '1 day', '1 second']
  const expected = ['1 second', '1 second', '1 day', '1 day']
  t.deepEqual(sortFrequencies(unsorted), expected)
})

test('sortFrequencies sorts mixed known and unknown frequencies correctly', t => {
  const unsorted = ['unknown1', '1 minute', 'unknown2', '1 second', '15 minutes']
  const sorted = sortFrequencies(unsorted)

  // Known frequencies should be first in order
  t.is(sorted[0], '1 second')
  t.is(sorted[1], '1 minute')
  t.is(sorted[2], '15 minutes')
  // Unknown frequencies should be last
  t.true(sorted.slice(3).includes('unknown1'))
  t.true(sorted.slice(3).includes('unknown2'))
})
