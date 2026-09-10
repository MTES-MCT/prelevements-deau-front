import test from 'ava'

import {
  campaignResponseSchedule, campaignScheduleDay, campaignScheduleErrors, isCampaignDay, shiftCampaignDay
} from './campaign-calendar.js'

test('les dates civiles sont strictes et traversent les mois et années bissextiles', t => {
  t.false(isCampaignDay('2026-02-30'))
  t.false(isCampaignDay(''))
  t.true(isCampaignDay('2028-02-29'))
  t.is(shiftCampaignDay('2028-03-01', -1), '2028-02-29')
  t.is(shiftCampaignDay('2026-12-31', 1), '2027-01-01')
  t.is(shiftCampaignDay('', 1), '')
})

test('la timeline du formulaire conserve les jours saisis, sans décalage de fuseau', t => {
  const schedule = campaignResponseSchedule({opensAt: '2026-11-01T00:00', closesAt: '2026-11-30T23:59', reminderDays: [3, 14, 3]})
  t.is(schedule.opening, '2026-11-01')
  t.is(schedule.deadline, '2026-11-30')
  t.deepEqual(schedule.reminders, [{days: 14, date: '2026-11-16'}, {days: 3, date: '2026-11-27'}])
})

test('les données persistées à minuit désignent le dernier jour inclus, été comme hiver', t => {
  t.is(campaignScheduleDay('2026-09-30T22:00:00Z', 'Europe/Paris', {deadline: true}), '2026-09-30')
  t.is(campaignScheduleDay('2026-11-30T23:00:00Z', 'Europe/Paris', {deadline: true}), '2026-11-30')
  t.is(campaignScheduleDay('2026-11-30T23:00:00Z', 'Europe/Paris'), '2026-12-01')
  t.is(campaignScheduleDay('2026-11-30T15:00:00Z', 'Europe/Paris', {deadline: true}), '2026-11-30')
  t.is(campaignScheduleDay('invalid'), '')
})

test('les relances traversent le changement d’heure en jours civils, pas en tranches de 24 heures', t => {
  const schedule = campaignResponseSchedule({closesAt: '2026-03-30T22:00:00Z', reminderDays: [3, 1, 0]})
  t.deepEqual(schedule.reminders.map(item => item.date), ['2026-03-27', '2026-03-29', '2026-03-30'])
})

test('la clôture laisse le temps de saisir le dernier relevé', t => {
  const form = {indexDates: ['2026-06-01', '2026-10-31'], closesAt: '2026-10-30T23:59'}
  t.true(campaignScheduleErrors(form).some(error => error.includes('dernier relevé')))
  t.deepEqual(campaignScheduleErrors({...form, closesAt: '2026-10-31T23:59'}), [])
  t.deepEqual(campaignScheduleErrors({...form, closesAt: ''}), [])
})

test('les relances nécessitent une clôture et ne précèdent jamais l’ouverture', t => {
  const form = {
    indexDates: [], opensAt: '2026-11-20T00:00', closesAt: '2026-11-30T23:59', reminderDays: [14, 3]
  }
  t.true(campaignScheduleErrors(form).some(error => error.includes('avant le début')))
  t.true(campaignScheduleErrors({...form, closesAt: ''}).some(error => error.includes('programmer les relances')))
  t.deepEqual(campaignScheduleErrors({...form, reminderDays: [10, 3]}), [])
})
