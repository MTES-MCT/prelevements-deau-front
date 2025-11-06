import test from 'ava'

import {buildDailyAndTimelineData} from '../aggregation.js'

test('buildDailyAndTimelineData returns empty arrays for missing inputs', t => {
  const result = buildDailyAndTimelineData({loadedValues: {}, selectedParams: []})
  t.deepEqual(result.dailyValues, [])
  t.deepEqual(result.timelineSamples, [])
})

test('buildDailyAndTimelineData aggregates daily values and preserves order', t => {
  const loadedValues = {
    volume: [
      {date: '2024-01-02', value: 1},
      {date: '2024-01-01', value: 2}
    ]
  }

  const {dailyValues, timelineSamples} = buildDailyAndTimelineData({
    loadedValues,
    selectedParams: ['volume']
  })

  t.deepEqual(dailyValues.map(entry => entry.date), ['2024-01-01', '2024-01-02'])
  t.is(dailyValues[0].values[0], 2)
  t.is(dailyValues[1].values[0], 1)
  t.is(timelineSamples.length, 2)
})

test('buildDailyAndTimelineData averages sub-daily values from objects', t => {
  const loadedValues = {
    volume: [
      {
        date: '2024-01-01',
        values: {
          '00:00': 2,
          '12:00': 4
        }
      }
    ]
  }

  const {dailyValues, timelineSamples} = buildDailyAndTimelineData({
    loadedValues,
    selectedParams: ['volume']
  })

  t.is(dailyValues.length, 1)
  t.is(dailyValues[0].values[0], 3)
  t.truthy(timelineSamples.find(sample => sample.time === '12:00' && sample.values[0] === 4))
})
