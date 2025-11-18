import test from 'ava'

import {buildComposedSeries} from './build-composed-series.js'

const baseStub = ({
  id,
  color = '#000',
  yAxisId = 'y-left'
}) => ({
  id,
  originalId: id,
  originalLabel: id,
  label: `${id} label`,
  color,
  xAxisId: 'time',
  yAxisId,
  showMark: false,
  connectNulls: false
})

const baseSegment = ({
  id,
  originalId,
  data,
  color = '#000'
}) => ({
  id,
  originalId,
  originalLabel: originalId,
  classification: 'default',
  data,
  xAxisId: 'time',
  yAxisId: 'y-left',
  color,
  connectNulls: false
})

test('buildComposedSeries keeps line segments when type=line', t => {
  const stubSeries = [baseStub({id: 'temperature'})]
  const segmentSeries = [
    baseSegment({
      id: 'temperature__segment-0',
      originalId: 'temperature',
      data: [1, null, 2]
    })
  ]

  const {legendSeries, lineSegments, barSeries} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    xAxisLength: 3,
    resolveSeriesType: () => 'line',
    resolveSeriesColor: (_, color) => color,
    formatBarValue: value => value
  })

  t.is(legendSeries.length, 1)
  t.is(legendSeries[0].type, 'line')
  t.is(lineSegments.length, 1)
  t.true(lineSegments.every(segment => segment.type === 'line'))
  t.is(barSeries.length, 0)
})

test('buildComposedSeries generates bar series for cumulative parameters', t => {
  const stubSeries = [baseStub({id: 'volume', color: '#123'})]
  const segmentSeries = [
    baseSegment({
      id: 'volume__segment-0',
      originalId: 'volume',
      data: [10, 20, null, 40]
    }),
    baseSegment({
      id: 'volume__segment-1',
      originalId: 'volume',
      data: [null, null, 30, null]
    })
  ]

  const {legendSeries, lineSegments, barSeries} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    xAxisLength: 4,
    resolveSeriesType: id => (id === 'volume' ? 'bar' : 'line'),
    resolveSeriesColor: (_, color) => color,
    formatBarValue: value => value
  })

  t.is(legendSeries[0].type, 'bar')
  t.deepEqual(lineSegments, [], 'no line segment for bar series')
  t.is(barSeries.length, 1)
  t.is(barSeries[0].type, 'bar')
  t.deepEqual(barSeries[0].data, [10, 20, 30, 40])
})

test('buildComposedSeries greys out hidden legend entries via resolveSeriesColor', t => {
  const stubSeries = [baseStub({id: 'hidden', color: '#111'})]
  const segmentSeries = []

  const {legendSeries} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    xAxisLength: 1,
    resolveSeriesType: () => 'line',
    resolveSeriesColor: (id, color) => (id === 'hidden' ? '#ccc' : color),
    formatBarValue: value => value
  })

  t.is(legendSeries[0].color, '#ccc')
})
