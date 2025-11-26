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

test('buildDailyAndTimelineData attaches remarks to meta for daily values', t => {
  const loadedValues = {
    volume: [
      {date: '2024-01-01', value: 2, remark: 'Estimation'},
      {date: '2024-01-02', value: 3, remarks: ['Capteur défectueux', 'Estimation']}
    ]
  }

  const {timelineSamples} = buildDailyAndTimelineData({
    loadedValues,
    selectedParams: ['volume']
  })

  const firstSample = timelineSamples.find(sample => sample.date === '2024-01-01')
  const secondSample = timelineSamples.find(sample => sample.date === '2024-01-02')

  t.is(firstSample?.metas?.[0]?.comment, 'Estimation')
  t.is(secondSample?.metas?.[0]?.comment, 'Capteur défectueux • Estimation')
})

test('buildDailyAndTimelineData attaches remarks to meta for sub-daily values', t => {
  const loadedValues = {
    volume: [
      {
        date: '2024-01-01',
        values: [
          {time: '00:00', value: 1, remark: 'Nuit'},
          {time: '06:00', value: 2, remarks: ['Matin', 'Nuit']},
          {time: '12:00', value: 3}
        ]
      }
    ]
  }

  const {timelineSamples} = buildDailyAndTimelineData({
    loadedValues,
    selectedParams: ['volume']
  })

  const nightSample = timelineSamples.find(sample => sample.time === '00:00')
  const morningSample = timelineSamples.find(sample => sample.time === '06:00')
  const noonSample = timelineSamples.find(sample => sample.time === '12:00')

  t.is(nightSample?.metas?.[0]?.comment, 'Nuit')
  t.is(morningSample?.metas?.[0]?.comment, 'Matin • Nuit')
  t.falsy(noonSample?.metas?.[0])
})
