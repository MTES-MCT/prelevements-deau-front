import test from 'ava'

import {
  PATTERN_DAY,
  PATTERN_MONTH,
  PATTERN_YEAR,
  monthFormatter,
  monthShortFormatter,
  capitalize,
  detectModeAndValidate,
  buildValueMap
} from './util.js'

// Pattern tests
test('PATTERN_DAY matches valid YYYY-MM-DD and rejects invalid', t => {
  t.true(PATTERN_DAY.test('2024-01-31'))
  t.false(PATTERN_DAY.test('2024-1-31'))
  t.false(PATTERN_DAY.test('24-01-31'))
  t.false(PATTERN_DAY.test('2024-01'))
})

test('PATTERN_MONTH matches valid YYYY-MM and rejects invalid', t => {
  t.true(PATTERN_MONTH.test('2024-12'))
  t.false(PATTERN_MONTH.test('2024-1'))
  t.false(PATTERN_MONTH.test('2024-12-01'))
  t.false(PATTERN_MONTH.test('24-12'))
})

test('PATTERN_YEAR matches valid YYYY and rejects invalid', t => {
  t.true(PATTERN_YEAR.test('1999'))
  t.false(PATTERN_YEAR.test('99'))
  t.false(PATTERN_YEAR.test('1999-01'))
})

// Formatter tests (locale fr-FR)
test('monthFormatter returns full lowercase French month name', t => {
  const date = new Date(2024, 2, 1) // March 1 2024
  const formatted = monthFormatter.format(date)
  t.is(formatted, 'mars')
})

test('monthShortFormatter returns short lowercase French month name', t => {
  const date = new Date(2024, 6, 1) // July 1 2024
  const formatted = monthShortFormatter.format(date)
  // In fr-FR, July short month is "juil."
  t.is(formatted, 'juil.')
})

// Capitalize
test('capitalize handles strings and edge cases', t => {
  t.is(capitalize('bonjour'), 'Bonjour')
  t.is(capitalize(''), '')
  t.is(capitalize(null), null)
  t.is(capitalize('a'), 'A')
})

// DetectModeAndValidate edge cases
test('detectModeAndValidate returns error when no values', t => {
  t.deepEqual(detectModeAndValidate([]), {mode: null, error: 'Aucune valeur fournie'})
})

test('detectModeAndValidate returns error when date missing', t => {
  t.deepEqual(detectModeAndValidate([{foo: 'bar'}]), {mode: null, error: 'Valeur de date manquante ou invalide'})
})

test('detectModeAndValidate returns error when unsupported format', t => {
  t.deepEqual(detectModeAndValidate([{date: '2024/05/01'}]), {mode: null, error: 'Format de date non supporté: 2024/05/01'})
})

test('detectModeAndValidate returns error when multiple formats mixed', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-05-01'}, // Day
      {date: '2024-05'} // Month
    ]),
    {mode: null, error: 'Plusieurs formats de dates détectés'}
  )
})

test('detectModeAndValidate month mode for day-level same month', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-05-01'},
      {date: '2024-05-31'}
    ]),
    {mode: 'month', error: null}
  )
})

test('detectModeAndValidate month mode for single day value', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-05-15'}
    ]),
    {mode: 'month', error: null}
  )
})

test('detectModeAndValidate error for day-level different months', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-05-01'},
      {date: '2024-06-01'}
    ]),
    {mode: null, error: 'Plusieurs mois détectés'}
  )
})

test('detectModeAndValidate year mode for month-level same year', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-01'},
      {date: '2024-12'}
    ]),
    {mode: 'year', error: null}
  )
})

test('detectModeAndValidate error for month-level different years', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2024-12'},
      {date: '2025-01'}
    ]),
    {mode: null, error: 'Plusieurs années détectées pour le mode année'}
  )
})

test('detectModeAndValidate years mode for year-level', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2022'},
      {date: '2023'}
    ]),
    {mode: 'years', error: null}
  )
})

test('detectModeAndValidate years mode for single year value', t => {
  t.deepEqual(
    detectModeAndValidate([
      {date: '2030'}
    ]),
    {mode: 'years', error: null}
  )
})

// BuildValueMap
test('buildValueMap builds key/value map with overwrite on duplicate', t => {
  const values = [
    {date: '2024-05-01', value: 1},
    {date: '2024-05-02', value: 2},
    {date: '2024-05-01', value: 3} // Duplicate should overwrite
  ]
  const map = buildValueMap(values)
  t.true(map instanceof Map)
  t.is(map.size, 2)
  t.deepEqual(map.get('2024-05-01'), {date: '2024-05-01', value: 3})
  t.deepEqual(map.get('2024-05-02'), {date: '2024-05-02', value: 2})
})
