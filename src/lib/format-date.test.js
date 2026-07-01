import test from 'ava'

import formatDate, {
  daysInMonth,
  firstDayOfMonth,
  formatDateRange,
  formatFullDateFr,
  getDefaultDate,
  getMonthPeriodRange,
  getRange,
  parseQuarterDate,
  safeParseDate,
  startOfDay
} from './format-date.js'

const localIsoDate = date => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-')

test('safeParseDate accepte les dates ISO et rejette les valeurs invalides', t => {
  t.is(localIsoDate(safeParseDate('2026-06-30')), '2026-06-30')
  t.is(safeParseDate('date invalide'), null)
  t.is(safeParseDate(null), null)
  t.is(safeParseDate(42), null)
})

test('safeParseDate conserve les Date valides sans accepter Invalid Date', t => {
  const date = new Date(2026, 5, 30)
  t.is(safeParseDate(date), date)
  t.is(safeParseDate(new Date('invalid')), null)
})

test('formatDate formate en jour/mois/année français', t => {
  t.is(formatDate('2026-06-30'), '30/06/2026')
  t.is(formatDate('date invalide'), null)
  t.is(formatDate(null), null)
})

test('formatFullDateFr gère le premier jour et les dates sans année métier', t => {
  t.is(formatFullDateFr('2026-01-01'), '1er janvier 2026')
  t.is(formatFullDateFr('2026-01-02'), '02 janvier 2026')
  t.is(formatFullDateFr('0001-06-15'), '15 juin')
  t.is(formatFullDateFr('date invalide'), null)
})

test('formatDateRange couvre les bornes complètes ou partielles', t => {
  t.is(formatDateRange('2026-06-01', '2026-06-30'), 'Du 1er juin 2026 au 30 juin 2026')
  t.is(formatDateRange('2026-06-01', null), 'Depuis le 1er juin 2026')
  t.is(formatDateRange(null, '2026-06-30'), 'Jusqu’au 30 juin 2026')
  t.is(formatDateRange(null, null), 'Non renseignée')
})

test('getDefaultDate retourne le début de mois ou de semaine', t => {
  const today = new Date(2026, 5, 30)
  t.is(localIsoDate(getDefaultDate('month', today)), '2026-06-01')
  t.is(localIsoDate(getDefaultDate('week', today)), '2026-06-29')
})

test('getRange transforme des dates en périodes mensuelles ordonnées', t => {
  const range = getRange([
    new Date(2026, 6, 20),
    new Date(2026, 5, 5)
  ], 'month')

  t.is(localIsoDate(range.from), '2026-06-01')
  t.is(localIsoDate(range.to), '2026-07-31')
  t.deepEqual(range.ranges.map(item => [localIsoDate(item.from), localIsoDate(item.to)]), [
    ['2026-06-01', '2026-06-30'],
    ['2026-07-01', '2026-07-31']
  ])
})

test('getRange transforme des dates en semaines ISO', t => {
  const range = getRange([new Date(2026, 5, 30)], 'week')
  t.is(localIsoDate(range.from), '2026-06-29')
  t.is(localIsoDate(range.to), '2026-07-05')
})

test('getRange retourne une période vide sans dates', t => {
  t.deepEqual(getRange([], 'month'), {from: null, to: null, ranges: []})
  t.deepEqual(getRange(null, 'month'), {from: null, to: null, ranges: []})
})

test('startOfDay supprime les heures', t => {
  const date = startOfDay(new Date(2026, 5, 30, 14, 45, 12))
  t.is(date.getHours(), 0)
  t.is(date.getMinutes(), 0)
  t.is(localIsoDate(date), '2026-06-30')
})

test('daysInMonth et firstDayOfMonth exposent les informations calendrier', t => {
  t.is(daysInMonth(2024, 1), 29)
  t.is(daysInMonth(2025, 1), 28)
  t.is(firstDayOfMonth(2026, 5), 1)
})

test('getMonthPeriodRange construit une plage mensuelle dans les deux sens', t => {
  t.deepEqual(getMonthPeriodRange(
    {year: 2026, month: 5},
    {year: 2026, month: 7}
  ), [
    {type: 'month', year: 2026, month: 5},
    {type: 'month', year: 2026, month: 6},
    {type: 'month', year: 2026, month: 7}
  ])

  t.deepEqual(getMonthPeriodRange(
    {year: 2026, month: 7},
    {year: 2026, month: 5},
    2
  ), [
    {type: 'month', year: 2026, month: 5},
    {type: 'month', year: 2026, month: 6}
  ])
})

test('parseQuarterDate retourne le premier jour du trimestre', t => {
  t.is(localIsoDate(parseQuarterDate('2026-Q1')), '2026-01-01')
  t.is(localIsoDate(parseQuarterDate('2026-Q4')), '2026-10-01')
  t.is(parseQuarterDate('2026-Q5'), null)
  t.is(parseQuarterDate(null), null)
})
