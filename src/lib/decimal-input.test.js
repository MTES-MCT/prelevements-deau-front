import test from 'ava'

import {countEditableNumberCharacters, formatNumberInput, getFormattedCaretPosition, normalizeNumberInput} from './decimal-input.js'

test('la saisie française est normalisée sans confondre une absence et zéro', t => {
  for (const value of ['', null, undefined]) {
    t.is(normalizeNumberInput(value), '')
    t.is(formatNumberInput(value), '')
  }
  t.is(normalizeNumberInput('0'), '0')
  t.is(formatNumberInput('0'), '0')
  t.is(normalizeNumberInput('12 345,67'), '12345.67')
  t.is(normalizeNumberInput('12\u202f345,67'), '12345.67')
  t.is(normalizeNumberInput('00012.050'), '12.050')
  t.is(formatNumberInput('12345.67'), '12 345,67')
})

test('les décimales en cours de saisie et tous les chiffres des grands index sont conservés', t => {
  t.is(normalizeNumberInput('12,'), '12.')
  t.is(formatNumberInput('12.'), '12,')
  t.is(normalizeNumberInput(',05'), '0.05')
  t.is(formatNumberInput('1234567890123456789.0001'), '1 234 567 890 123 456 789,0001')
  t.is(normalizeNumberInput(formatNumberInput('1234567890123456789.0001')), '1234567890123456789.0001')
})

test('le curseur conserve sa position lors du regroupement des milliers', t => {
  t.is(countEditableNumberCharacters('12 345,67', 5), 4)
  t.is(countEditableNumberCharacters('12345.67', 6), 6)
  t.is(getFormattedCaretPosition('12 345,67', 4), 5)
  t.is(getFormattedCaretPosition('12 345,67', 6), 7)
  t.is(getFormattedCaretPosition('12 345,67', 0), 0)
  t.is(getFormattedCaretPosition('12 345,67', 20), 9)
})
