import test from 'ava'
import {parseISO} from 'date-fns'

import {determineColors, buildCalendars, normalizeTimestamps, DEFAULT_PALETTE} from './util.js'

// NormalizeTimestamps tests

test('normalizeTimestamps corrects 4-hour offset', t => {
  const timeSlots = [
    {heure: '04:00:00'},
    {heure: '04:15:00'},
    {heure: '04:30:00'}
  ]
  const normalized = normalizeTimestamps(timeSlots, '2025-09-11', parseISO)
  
  t.is(normalized.length, 3)
  t.is(normalized[0].getHours(), 0)
  t.is(normalized[0].getMinutes(), 0)
  t.is(normalized[1].getHours(), 0)
  t.is(normalized[1].getMinutes(), 15)
  t.is(normalized[2].getHours(), 0)
  t.is(normalized[2].getMinutes(), 30)
})

test('normalizeTimestamps handles midnight start time', t => {
  const timeSlots = [
    {heure: '00:00:00'},
    {heure: '00:15:00'}
  ]
  const normalized = normalizeTimestamps(timeSlots, '2025-09-11', parseISO)
  
  t.is(normalized[0].getHours(), 0)
  t.is(normalized[0].getMinutes(), 0)
  t.is(normalized[1].getHours(), 0)
  t.is(normalized[1].getMinutes(), 15)
})

test('normalizeTimestamps handles empty array', t => {
  const normalized = normalizeTimestamps([], '2025-09-11', parseISO)
  t.deepEqual(normalized, [])
})

test('normalizeTimestamps preserves same day', t => {
  const timeSlots = [
    {heure: '04:00:00'},
    {heure: '23:45:00'}
  ]
  const normalized = normalizeTimestamps(timeSlots, '2025-09-11', parseISO)
  
  // First entry at midnight
  t.is(normalized[0].getHours(), 0)
  t.is(normalized[0].getMinutes(), 0)
  
  // Last entry at 19:45 (23:45 - 4 hours)
  t.is(normalized[1].getHours(), 19)
  t.is(normalized[1].getMinutes(), 45)
  
  // Both should be on the same day
  t.is(normalized[0].getDate(), normalized[1].getDate())
})

// DetermineColors tests

test('determineColors red when negative value present', t => {
  const {color} = determineColors([-5], null, [], DEFAULT_PALETTE)
  t.is(color, DEFAULT_PALETTE.error)
})

test('determineColors blue when volume preleve present', t => {
  // eslint-disable-next-line camelcase
  const params = [{nom_parametre: 'volume prélevé'}]
  const {color} = determineColors([10], null, params, DEFAULT_PALETTE)
  t.is(color, DEFAULT_PALETTE.blue)
})

test('determineColors orange when other data but volume missing', t => {
  // eslint-disable-next-line camelcase
  const params = [{nom_parametre: 'volume prélevé'}]
  const {color} = determineColors([Number.NaN], [{values: [null]}], params, DEFAULT_PALETTE)
  t.is(color, DEFAULT_PALETTE.warning)
})

test('determineColors grey when no data', t => {
  const {color} = determineColors([], null, [], DEFAULT_PALETTE)
  t.is(color, DEFAULT_PALETTE.grey)
})

// BuildCalendars tests

test('buildCalendars groups by month and sorts days', t => {
  const data = {
    // eslint-disable-next-line camelcase
    dailyParameters: [{nom_parametre: 'volume prélevé'}],
    dailyValues: [
      {date: '2024-09-02', values: [5]},
      {date: '2024-09-01', values: [4]},
      {date: '2024-10-01', values: [3]}
    ]
  }
  const calendars = buildCalendars(data)
  t.is(calendars.length, 2)
  t.deepEqual(calendars[0].map(d => d.date), ['2024-09-01', '2024-09-02'])
  t.deepEqual(calendars[1].map(d => d.date), ['2024-10-01'])
})

test('buildCalendars empty when no dailyValues', t => {
  t.deepEqual(buildCalendars({dailyValues: []}), [])
})
