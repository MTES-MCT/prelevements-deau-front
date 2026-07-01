import test from 'ava'

import {
  normalizeDate,
  normalizeTime,
  parseLocalDateTime
} from '../time.js'

test('normalizeTime accepte HH:mm et HH:mm:ss', t => {
  t.is(normalizeTime('8:05'), '08:05')
  t.is(normalizeTime('08:05:30'), '08:05')
  t.is(normalizeTime(' 23:59 '), '23:59')
})

test('normalizeTime rejette les valeurs non interprétables', t => {
  t.is(normalizeTime('24:00'), null)
  t.is(normalizeTime('10:60'), null)
  t.is(normalizeTime('aa:10'), null)
  t.is(normalizeTime(null), null)
})

test('normalizeDate retourne YYYY-MM-DD pour une Date locale', t => {
  t.is(normalizeDate(new Date(2026, 5, 30, 12)), '2026-06-30')
  t.is(normalizeDate('2026-06-30'), '2026-06-30')
  t.is(normalizeDate(''), undefined)
  t.is(normalizeDate(null), undefined)
})

test('parseLocalDateTime parse dates seules et dates avec heure explicite', t => {
  const dateOnly = parseLocalDateTime('2026-06-30')
  t.is(dateOnly.getFullYear(), 2026)
  t.is(dateOnly.getMonth(), 5)
  t.is(dateOnly.getDate(), 30)
  t.is(dateOnly.getHours(), 0)

  const withTime = parseLocalDateTime('2026-06-30', '14:45:12')
  t.is(withTime.getHours(), 14)
  t.is(withTime.getMinutes(), 45)
  t.is(withTime.getSeconds(), 12)
})

test('parseLocalDateTime infère l’heure depuis une chaîne ISO ou espace', t => {
  t.is(parseLocalDateTime('2026-06-30T08:15:30Z').getHours(), 8)
  t.is(parseLocalDateTime('2026-06-30 09:20:00').getMinutes(), 20)
})

test('parseLocalDateTime rejette les dates impossibles et heures invalides', t => {
  t.is(parseLocalDateTime('2026-02-31'), null)
  t.is(parseLocalDateTime('2026-13-01'), null)
  t.is(parseLocalDateTime('not-a-date'), null)
  t.is(parseLocalDateTime('2026-06-30', '24:00'), null)
})
