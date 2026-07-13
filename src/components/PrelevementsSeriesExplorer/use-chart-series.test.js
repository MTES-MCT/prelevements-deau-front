import test from 'ava'

import {shouldRenderCumulativeSeriesAsArea} from './use-chart-series.js'

test('a single cumulative series can use the area display', t => {
  const volume = {unit: 'm³', valueType: 'cumulative'}

  t.true(shouldRenderCumulativeSeriesAsArea([volume], volume))
})

test('opposite cumulative flows sharing an axis are rendered as separate lines', t => {
  const withdrawn = {unit: 'm³', valueType: 'cumulative'}
  const discharged = {unit: 'm³', valueType: 'cumulative'}

  t.false(shouldRenderCumulativeSeriesAsArea([withdrawn, discharged], withdrawn))
  t.false(shouldRenderCumulativeSeriesAsArea([withdrawn, discharged], discharged))
})

test('instantaneous index series never use a stacked area', t => {
  const index = {unit: 'm³', valueType: 'instantaneous'}

  t.false(shouldRenderCumulativeSeriesAsArea([index], index))
})
