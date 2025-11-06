import test from 'ava'

import {
  AGGREGATED_PARAMETERS,
  DEFAULT_AGGREGATION_FREQUENCY,
  getAvailableParametersFromSeries,
  getAutomaticFrequency,
  getParameterMetadata
} from '../parameters.js'

test('getParameterMetadata returns matching entry (case insensitive)', t => {
  const metadata = getParameterMetadata('Volume PRÉLEVÉ')
  t.truthy(metadata)
  t.is(metadata.parameter, 'volume prélevé')
  t.deepEqual(metadata.operators, ['sum', 'mean', 'min', 'max'])
})

test('getAvailableParametersFromSeries filters by provided series list', t => {
  const fakeSeries = [
    {parameter: 'volume prélevé'},
    {parametre: 'débit restitué'}
  ]

  const available = getAvailableParametersFromSeries(fakeSeries)
  t.true(available.length < AGGREGATED_PARAMETERS.length)
  t.deepEqual(
    available.map(entry => entry.parameter),
    ['volume prélevé', 'débit restitué']
  )
})

test('getAvailableParametersFromSeries returns full list when no match', t => {
  const available = getAvailableParametersFromSeries([{parameter: null}])
  t.is(available.length, AGGREGATED_PARAMETERS.length)
})

test('getAutomaticFrequency picks expected bucket', t => {
  t.is(getAutomaticFrequency(), DEFAULT_AGGREGATION_FREQUENCY)
  t.is(getAutomaticFrequency([{type: 'day'}]), '1 hour')
  t.is(getAutomaticFrequency([{type: 'month'}]), '1 day')
  t.is(getAutomaticFrequency([{type: 'year'}]), '1 week')
  t.is(getAutomaticFrequency([{type: 'year'}, {type: 'year'}]), '1 month')
})
