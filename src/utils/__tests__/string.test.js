import test from 'ava'

import {normalizeString, emptyStringToNull} from '../string.js'

test('normalizeString', t => {
  t.is(normalizeString('  Hello World!  '), 'hello world!')
  t.is(normalizeString(''), '')
  t.is(normalizeString(null), '')
})

test('emptyStringToNull', t => {
  t.deepEqual(emptyStringToNull({a: '', b: 'test', c: undefined}), {a: null, b: 'test', c: null})
  t.deepEqual(emptyStringToNull({}), {})
})
