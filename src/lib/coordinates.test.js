import test from 'ava'

import {
  formatCoordinateInput,
  lambert93ToWgs84,
  parseCoordinateInput,
  wgs84ToLambert93
} from './coordinates.js'

const isCloseTo = (actual, expected, tolerance) => Math.abs(actual - expected) <= tolerance

test('convertit les coordonnées GPS en Lambert 93', t => {
  const lambertCoordinates = wgs84ToLambert93([2.3522, 48.8566])

  t.truthy(lambertCoordinates)
  t.true(isCloseTo(lambertCoordinates[0], 652_469, 1))
  t.true(isCloseTo(lambertCoordinates[1], 6_862_035, 1))
})

test('convertit les coordonnées Lambert 93 en GPS sans changer le stockage attendu', t => {
  const gpsCoordinates = lambert93ToWgs84([652_469, 6_862_035])

  t.truthy(gpsCoordinates)
  t.true(isCloseTo(gpsCoordinates[0], 2.3522, 0.000_01))
  t.true(isCloseTo(gpsCoordinates[1], 48.8566, 0.000_01))
})

test('parse les saisies françaises de coordonnées', t => {
  t.is(parseCoordinateInput('652469,12'), 652_469.12)
  t.is(parseCoordinateInput('6 862 035,25'), 6_862_035.25)
  t.is(parseCoordinateInput('652469.12'), 652_469.12)
  t.is(parseCoordinateInput(''), null)
  t.is(parseCoordinateInput('abc'), null)
})

test('formate les coordonnées de saisie sans séparateur de milliers', t => {
  t.is(formatCoordinateInput(2.213_749), '2,213749')
  t.is(formatCoordinateInput(6_862_035.251, 2), '6862035,25')
})
