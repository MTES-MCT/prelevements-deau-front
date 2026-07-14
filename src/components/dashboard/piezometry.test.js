import test from 'ava'

import {
  getPiezometryYAxisConfig,
  isHistoricalPiezometryPeriod,
  isIpsPiezometryPeriod,
  PIEZOMETRY_IPS_BANDS
} from './piezometry.js'

test('la profondeur utilise un axe inversé', t => {
  t.deepEqual(getPiezometryYAxisConfig('depth'), {
    label: 'Profondeur (m)',
    reverse: true,
    minimum: null,
    maximum: null
  })
  t.false(getPiezometryYAxisConfig('level').reverse)
  t.false(getPiezometryYAxisConfig('ips').reverse)
})

test('l’axe IPS reste fixe de -3 à 3', t => {
  t.deepEqual(getPiezometryYAxisConfig('ips'), {
    label: 'IPS mensuel',
    reverse: false,
    minimum: -3,
    maximum: 3
  })
})

test('les périodes historiques sont identifiées', t => {
  t.false(isHistoricalPiezometryPeriod('year'))
  t.true(isHistoricalPiezometryPeriod('five-years'))
  t.true(isHistoricalPiezometryPeriod('ten-years'))
  t.true(isHistoricalPiezometryPeriod('twenty-years'))
})

test('l’IPS est réservé aux périodes mensuelles assez longues', t => {
  t.false(isIpsPiezometryPeriod('week'))
  t.false(isIpsPiezometryPeriod('month'))
  t.true(isIpsPiezometryPeriod('year'))
  t.true(isIpsPiezometryPeriod('five-years'))
})

test('les sept bandes IPS couvrent sans trou l’axe complet', t => {
  t.is(PIEZOMETRY_IPS_BANDS.length, 7)
  t.is(PIEZOMETRY_IPS_BANDS[0].minimum, -3)
  t.is(PIEZOMETRY_IPS_BANDS.at(-1).maximum, 3)

  for (let index = 1; index < PIEZOMETRY_IPS_BANDS.length; index += 1) {
    t.is(PIEZOMETRY_IPS_BANDS[index - 1].maximum, PIEZOMETRY_IPS_BANDS[index].minimum)
  }
})
