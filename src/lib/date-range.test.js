import test from 'ava'

import {
  buildMonthlyDateRangePresets,
  getInclusiveDayCount,
  parseDateInput
} from './date-range.js'

test('parseDateInput refuse les dates calendaires impossibles', t => {
  t.is(parseDateInput('2026-02-29'), null)
  t.is(parseDateInput('10/08/2026'), null)
  t.is(parseDateInput('2024-02-29')?.getDate(), 29)
})

test('getInclusiveDayCount compte les deux bornes', t => {
  t.is(getInclusiveDayCount('2026-08-01', '2026-08-10'), 10)
  t.is(getInclusiveDayCount('2026-08-10', '2026-08-10'), 1)
  t.is(getInclusiveDayCount('2026-08-11', '2026-08-10'), 0)
})

test('les périodes de saisie rapide respectent la date maximale', t => {
  t.deepEqual(buildMonthlyDateRangePresets('2026-08-10'), [
    {
      label: 'Mois précédent',
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    },
    {
      label: 'Mois en cours',
      startDate: '2026-08-01',
      endDate: '2026-08-10'
    }
  ])
})
