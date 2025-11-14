import test from 'ava'

import {
  applyGapDetectionToSeries,
  calculateGapThreshold,
  insertGapPoints,
  parseFrequencyToMs
} from '../gap-detection.js'

// ParseFrequencyToMs tests
test('parseFrequencyToMs parses day frequency correctly', t => {
  t.is(parseFrequencyToMs('1 day'), 24 * 60 * 60 * 1000)
  t.is(parseFrequencyToMs('7 days'), 7 * 24 * 60 * 60 * 1000)
})

test('parseFrequencyToMs parses hour frequency correctly', t => {
  t.is(parseFrequencyToMs('1 hour'), 60 * 60 * 1000)
  t.is(parseFrequencyToMs('12 hours'), 12 * 60 * 60 * 1000)
})

test('parseFrequencyToMs parses week frequency correctly', t => {
  t.is(parseFrequencyToMs('1 week'), 7 * 24 * 60 * 60 * 1000)
  t.is(parseFrequencyToMs('2 weeks'), 2 * 7 * 24 * 60 * 60 * 1000)
})

test('parseFrequencyToMs parses month frequency correctly (approximation)', t => {
  t.is(parseFrequencyToMs('1 month'), 30 * 24 * 60 * 60 * 1000)
  t.is(parseFrequencyToMs('3 months'), 3 * 30 * 24 * 60 * 60 * 1000)
})

test('parseFrequencyToMs parses year frequency correctly (approximation)', t => {
  t.is(parseFrequencyToMs('1 year'), 365 * 24 * 60 * 60 * 1000)
})

test('parseFrequencyToMs handles case-insensitive input', t => {
  t.is(parseFrequencyToMs('1 DAY'), 24 * 60 * 60 * 1000)
  t.is(parseFrequencyToMs('1 Day'), 24 * 60 * 60 * 1000)
})

test('parseFrequencyToMs returns null for invalid frequency', t => {
  t.is(parseFrequencyToMs('invalid'), null)
  t.is(parseFrequencyToMs('1 second'), null)
  t.is(parseFrequencyToMs(''), null)
  t.is(parseFrequencyToMs(null), null)
})

// CalculateGapThreshold tests
test('calculateGapThreshold applies default multiplier', t => {
  const dayMs = 24 * 60 * 60 * 1000
  t.is(calculateGapThreshold(dayMs), dayMs * 1.5)
})

test('calculateGapThreshold applies custom multiplier', t => {
  const dayMs = 24 * 60 * 60 * 1000
  t.is(calculateGapThreshold(dayMs, 2), dayMs * 2)
  t.is(calculateGapThreshold(dayMs, 3), dayMs * 3)
})

test('calculateGapThreshold returns infinity for invalid frequency', t => {
  t.is(calculateGapThreshold(0), Number.POSITIVE_INFINITY)
  t.is(calculateGapThreshold(null), Number.POSITIVE_INFINITY)
  t.is(calculateGapThreshold(-1), Number.POSITIVE_INFINITY)
})

// InsertGapPoints tests
test('insertGapPoints returns empty array for empty data', t => {
  t.deepEqual(insertGapPoints([], '1 day'), [])
})

test('insertGapPoints preserves single point data', t => {
  const data = [{x: new Date('2024-01-01'), y: 10}]
  const result = insertGapPoints(data, '1 day')
  t.is(result.length, 1)
  t.is(result[0].y, 10)
  t.is(result[0].isGapPoint, false)
})

test('insertGapPoints does not insert gap for continuous daily data', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: 20},
    {x: new Date('2024-01-03'), y: 30}
  ]
  const result = insertGapPoints(data, '1 day')
  t.is(result.length, 3)
  t.true(result.every(point => point.isGapPoint === false))
})

test('insertGapPoints inserts null point for significant gap with daily data', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-05'), y: 20} // Gap of 4 days (> 1.5 days threshold)
  ]
  const result = insertGapPoints(data, '1 day')
  t.is(result.length, 3) // Original 2 points + 1 gap point
  t.is(result[0].y, 10)
  t.is(result[1].y, null)
  t.is(result[1].isGapPoint, true)
  t.is(result[2].y, 20)
})

test('insertGapPoints handles multiple gaps in series', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-05'), y: 20}, // Gap 1
    {x: new Date('2024-01-06'), y: 30},
    {x: new Date('2024-01-10'), y: 40} // Gap 2
  ]
  const result = insertGapPoints(data, '1 day')
  t.is(result.length, 6) // 4 original + 2 gap points
  const gapPoints = result.filter(p => p.isGapPoint)
  t.is(gapPoints.length, 2)
})

test('insertGapPoints respects custom gap multiplier', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-03'), y: 20} // Gap of 2 days
  ]

  // With multiplier 1.5 (default): 2 days > 1.5 days, should insert gap
  const result1 = insertGapPoints(data, '1 day', 1.5)
  t.is(result1.length, 3)

  // With multiplier 3: 2 days < 3 days, should not insert gap
  const result2 = insertGapPoints(data, '1 day', 3)
  t.is(result2.length, 2)
})

test('insertGapPoints handles hourly data correctly', t => {
  const data = [
    {x: new Date('2024-01-01T10:00:00'), y: 10},
    {x: new Date('2024-01-01T13:00:00'), y: 20} // Gap of 3 hours (> 1.5 hours threshold)
  ]
  const result = insertGapPoints(data, '1 hour')
  t.is(result.length, 3) // Should insert gap point
})

test('insertGapPoints handles weekly data correctly', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-22'), y: 20} // Gap of 3 weeks (> 1.5 weeks threshold)
  ]
  const result = insertGapPoints(data, '1 week')
  t.is(result.length, 3) // Should insert gap point
})

test('insertGapPoints returns data unchanged for unparseable frequency', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-10'), y: 20}
  ]
  const result = insertGapPoints(data, 'invalid')
  t.is(result.length, 2)
  t.deepEqual(result, data)
  t.false('isGapPoint' in result[0])
  t.false('isGapPoint' in result[1])
})

test('insertGapPoints handles Date objects and timestamps', t => {
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-05'), y: 20}
  ]
  const result = insertGapPoints(data, '1 day')
  t.is(result.length, 3)
  t.true(result[1].x instanceof Date)
})

// ApplyGapDetectionToSeries tests
test('applyGapDetectionToSeries applies gap detection to multiple series', t => {
  const series = [
    {
      id: 'temp',
      data: [
        {x: new Date('2024-01-01'), y: 10},
        {x: new Date('2024-01-05'), y: 20}
      ]
    },
    {
      id: 'humidity',
      data: [
        {x: new Date('2024-01-01'), y: 50},
        {x: new Date('2024-01-05'), y: 60}
      ]
    }
  ]

  const result = applyGapDetectionToSeries(series, '1 day')
  t.is(result.length, 2)
  t.is(result[0].data.length, 3) // Should have gap point
  t.is(result[1].data.length, 3) // Should have gap point
})

test('applyGapDetectionToSeries preserves series properties', t => {
  const series = [
    {
      id: 'temp',
      label: 'Temperature',
      color: '#ff0000',
      data: [
        {x: new Date('2024-01-01'), y: 10},
        {x: new Date('2024-01-02'), y: 20}
      ]
    }
  ]

  const result = applyGapDetectionToSeries(series, '1 day')
  t.is(result[0].id, 'temp')
  t.is(result[0].label, 'Temperature')
  t.is(result[0].color, '#ff0000')
})

test('applyGapDetectionToSeries returns unchanged for missing frequency', t => {
  const series = [
    {
      id: 'temp',
      data: [{x: new Date('2024-01-01'), y: 10}]
    }
  ]

  const result = applyGapDetectionToSeries(series, null)
  t.deepEqual(result, series)
})

test('applyGapDetectionToSeries handles empty series array', t => {
  t.deepEqual(applyGapDetectionToSeries([], '1 day'), [])
})

// IdentifySegmentBoundaries tests
test('identifySegmentBoundaries returns empty array for empty data', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  t.deepEqual(identifySegmentBoundaries([]), [])
})

test('identifySegmentBoundaries marks single point as showMark true', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [{x: new Date('2024-01-01'), y: 10}]
  const result = identifySegmentBoundaries(data)

  t.is(result.length, 1)
  t.is(result[0].showMark, true)
})

test('identifySegmentBoundaries marks first and last points of continuous segment', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: 20},
    {x: new Date('2024-01-03'), y: 30},
    {x: new Date('2024-01-04'), y: 40}
  ]
  const result = identifySegmentBoundaries(data)

  t.is(result.length, 4)
  t.is(result[0].showMark, true) // First point
  t.is(result[1].showMark, false) // Middle point
  t.is(result[2].showMark, false) // Middle point
  t.is(result[3].showMark, true) // Last point
})

test('identifySegmentBoundaries handles gap points correctly', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10, isGapPoint: false},
    {x: new Date('2024-01-02'), y: 20, isGapPoint: false},
    {x: new Date('2024-01-03'), y: null, isGapPoint: true}, // Gap
    {x: new Date('2024-01-04'), y: 30, isGapPoint: false},
    {x: new Date('2024-01-05'), y: 40, isGapPoint: false}
  ]
  const result = identifySegmentBoundaries(data)

  t.is(result.length, 5)
  // First segment (2 points)
  t.is(result[0].showMark, true) // First of segment 1
  t.is(result[1].showMark, true) // Last of segment 1
  // Gap
  t.is(result[2].showMark, false) // Gap point
  // Second segment (2 points)
  t.is(result[3].showMark, true) // First of segment 2
  t.is(result[4].showMark, true) // Last of segment 2
})

test('identifySegmentBoundaries handles multiple gaps', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: null, isGapPoint: true},
    {x: new Date('2024-01-03'), y: 20},
    {x: new Date('2024-01-04'), y: 30},
    {x: new Date('2024-01-05'), y: null, isGapPoint: true},
    {x: new Date('2024-01-06'), y: 40}
  ]
  const result = identifySegmentBoundaries(data)

  // Segment 1: single point
  t.is(result[0].showMark, true)
  // Gap 1
  t.is(result[1].showMark, false)
  // Segment 2: 2 points
  t.is(result[2].showMark, true) // First
  t.is(result[3].showMark, true) // Last
  // Gap 2
  t.is(result[4].showMark, false)
  // Segment 3: single point
  t.is(result[5].showMark, true)
})

test('identifySegmentBoundaries handles null values as gaps', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: null}, // Null value (not marked as gap point)
    {x: new Date('2024-01-03'), y: 20}
  ]
  const result = identifySegmentBoundaries(data)

  t.is(result[0].showMark, true) // Isolated point
  t.is(result[1].showMark, false) // Null value
  t.is(result[2].showMark, true) // Isolated point
})

test('identifySegmentBoundaries handles three-point segment', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: 20},
    {x: new Date('2024-01-03'), y: 30}
  ]
  const result = identifySegmentBoundaries(data)

  t.is(result.length, 3)
  t.is(result[0].showMark, true) // First
  t.is(result[1].showMark, false) // Middle
  t.is(result[2].showMark, true) // Last
})

test('identifySegmentBoundaries handles two-point segment', async t => {
  const {identifySegmentBoundaries} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: 20}
  ]
  const result = identifySegmentBoundaries(data)

  t.is(result.length, 2)
  t.is(result[0].showMark, true) // First
  t.is(result[1].showMark, true) // Last (also first of 2-point segment)
})

// ProcessTimeSeriesData tests
test('processTimeSeriesData combines gap detection and boundary marking', async t => {
  const {processTimeSeriesData} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-05'), y: 20} // Should create gap
  ]

  const result = processTimeSeriesData(data, '1 day')

  // Should have: point 1, gap point, point 2
  t.is(result.length, 3)
  t.is(result[0].showMark, true) // First point of segment 1
  t.is(result[1].isGapPoint, true) // Gap
  t.is(result[1].showMark, false) // Gap shouldn't show mark
  t.is(result[2].showMark, true) // Single point of segment 2
})

test('processTimeSeriesData handles continuous data without gaps', async t => {
  const {processTimeSeriesData} = await import('../gap-detection.js')
  const data = [
    {x: new Date('2024-01-01'), y: 10},
    {x: new Date('2024-01-02'), y: 20},
    {x: new Date('2024-01-03'), y: 30}
  ]

  const result = processTimeSeriesData(data, '1 day')

  t.is(result.length, 3)
  t.is(result[0].showMark, true) // First
  t.is(result[1].showMark, false) // Middle
  t.is(result[2].showMark, true) // Last
})
