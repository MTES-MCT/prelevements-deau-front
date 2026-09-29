import test from 'ava'

import {coerceNumericValue, formatNumber, groupIntegerDigits} from '../number.js'

test('groupIntegerDigits conserve tous les chiffres et les séparateurs sans conversion numérique', t => {
  t.is(groupIntegerDigits('0'), '0')
  t.is(groupIntegerDigits('123'), '123')
  t.is(groupIntegerDigits('1234567'), '1 234 567')
  t.is(groupIntegerDigits('12345678901234567890', '\u202F'), '12\u202F345\u202F678\u202F901\u202F234\u202F567\u202F890')
  t.is(groupIntegerDigits('9'.repeat(100_000)).replaceAll(' ', ''), '9'.repeat(100_000))
})

test('formatNumber formate les nombres en français sans décimales par défaut', t => {
  t.is(formatNumber(12_345.67), '12 346')
  t.is(formatNumber(0), '0')
})

test('formatNumber accepte les options Intl', t => {
  t.is(formatNumber(12.345, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }), '12,35')
})

test('formatNumber retourne vide pour les valeurs non numériques', t => {
  t.is(formatNumber('123'), '')
  t.is(formatNumber(Number.NaN), '')
  t.is(formatNumber(null), '')
})

test('coerceNumericValue conserve les nombres finis', t => {
  t.is(coerceNumericValue(12.5), 12.5)
  t.is(coerceNumericValue(Number.POSITIVE_INFINITY), null)
  t.is(coerceNumericValue(Number.NaN), null)
})

test('coerceNumericValue parse les chaînes françaises', t => {
  t.is(coerceNumericValue('1 234,56'), 1234.56)
  t.is(coerceNumericValue(' 12.5 '), 12.5)
  t.is(coerceNumericValue(''), null)
  t.is(coerceNumericValue('abc'), null)
})
