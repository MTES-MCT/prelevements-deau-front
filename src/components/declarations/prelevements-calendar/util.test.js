import test from 'ava'

import {determineColors, buildCalendars, DEFAULT_PALETTE} from './util.js'

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
