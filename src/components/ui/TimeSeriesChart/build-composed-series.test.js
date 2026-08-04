import test from 'ava'

import {buildComposedSeries, buildSeriesElementStyles} from './build-composed-series.js'

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

test('buildComposedSeries keeps line segments', t => {
  const stubSeries = [baseStub({id: 'temperature'})]
  const segmentSeries = [
    baseSegment({
      id: 'temperature__segment-0',
      originalId: 'temperature',
      data: [1, null, 2]
    })
  ]

  const {legendSeries, lineSegments} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    resolveSeriesColor: (_, color) => color
  })

  t.is(legendSeries.length, 1)
  t.is(legendSeries[0].type, 'line')
  t.is(lineSegments.length, 1)
  t.true(lineSegments.every(segment => segment.type === 'line'))
})

test('buildComposedSeries processes all segments as lines', t => {
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

  const {legendSeries, lineSegments} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    resolveSeriesColor: (_, color) => color
  })

  t.is(legendSeries[0].type, 'line')
  t.is(lineSegments.length, 2, 'all segments processed as line segments')
  t.true(lineSegments.every(segment => segment.type === 'line'))
})

test('buildComposedSeries renders cumulative buckets as filled stepped lines', t => {
  const stubSeries = [{...baseStub({id: 'volume'}), curve: 'stepAfter', area: true}]
  const segmentSeries = [{
    ...baseSegment({
      id: 'volume__segment-0',
      originalId: 'volume',
      data: [10, 20]
    }),
    curve: 'stepAfter',
    area: true
  }]

  const {legendSeries, lineSegments} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    resolveSeriesColor: (_, color) => color
  })

  t.is(legendSeries[0].curve, 'stepAfter')
  t.true(legendSeries[0].area)
  t.is(lineSegments[0].type, 'line')
  t.is(lineSegments[0].curve, 'stepAfter')
  t.true(lineSegments[0].area)
  t.falsy(lineSegments[0].stack)
})

test('buildComposedSeries greys out hidden legend entries via resolveSeriesColor', t => {
  const stubSeries = [baseStub({id: 'hidden', color: '#111'})]
  const segmentSeries = []

  const {legendSeries} = buildComposedSeries({
    stubSeries,
    segmentSeries,
    dynamicThresholdSeries: [],
    resolveSeriesColor: (id, color) => (id === 'hidden' ? '#ccc' : color)
  })

  t.is(legendSeries[0].color, '#ccc')
})

test('buildSeriesElementStyles uses a light fill and a stronger stepped outline', t => {
  const styles = buildSeriesElementStyles({
    composedSeries: [{id: 'volume__segment-0', curve: 'stepAfter', area: true}],
    dynamicThresholdSeries: [{id: 'threshold-volume'}]
  })

  t.deepEqual(styles['& .MuiLineElement-series-volume__segment-0'], {
    strokeLinecap: 'round',
    strokeWidth: 3
  })
  t.deepEqual(styles['& .MuiAreaElement-series-volume__segment-0'], {fillOpacity: 0.18})
  t.deepEqual(styles['& .MuiLineElement-series-threshold-volume'], {strokeDasharray: '4 4'})
})
