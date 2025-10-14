import test from 'ava'
import {addDays, startOfDay} from 'date-fns'

import {
  buildCalendarEntriesFromMetadata,
  fillDateGaps,
  periodsToDateRange,
  formatDateRange,
  buildCalendarData,
  filterSeriesByParameters,
  getUniqueUnits,
  validateParameterSelection,
  clamp,
  computeSliderMarks,
  transformSeriesToData
} from './util.js'

/* eslint-disable capitalized-comments */

// Mock calendar status colors for testing
const mockStatusColors = {
  noSampling: '#2196F3',
  notDeclared: '#9E9E9E',
  present: '#0078f3'
}

// FillDateGaps tests
test('fillDateGaps returns empty arrays for empty input', t => {
  const result = fillDateGaps([])
  t.deepEqual(result.allDates, [])
  t.is(result.indexMap.size, 0)
})

test('fillDateGaps fills gaps between dates', t => {
  const dates = [
    new Date(2024, 0, 1),
    new Date(2024, 0, 5)
  ]

  const result = fillDateGaps(dates)

  t.is(result.allDates.length, 5) // 1st, 2nd, 3rd, 4th, 5th
  t.true(result.indexMap.has(0)) // First date maps to original index 0
  t.true(result.indexMap.has(4)) // Last date maps to original index 1
  t.is(result.indexMap.get(0), 0)
  t.is(result.indexMap.get(4), 1)
})

test('fillDateGaps handles consecutive dates', t => {
  const dates = [
    new Date(2024, 0, 1),
    new Date(2024, 0, 2),
    new Date(2024, 0, 3)
  ]

  const result = fillDateGaps(dates)

  t.is(result.allDates.length, 3)
  t.is(result.indexMap.size, 3)
})

// periodsToDateRange tests
test('periodsToDateRange returns null for empty periods', t => {
  t.is(periodsToDateRange([]), null)
  t.is(periodsToDateRange(null), null)
})

test('periodsToDateRange handles year periods', t => {
  const periods = [
    {type: 'year', value: 2024},
    {type: 'year', value: 2025}
  ]

  const result = periodsToDateRange(periods)

  t.truthy(result)
  t.deepEqual(result.start, new Date(2024, 0, 1))
  t.deepEqual(result.end, new Date(2025, 11, 31))
})

test('periodsToDateRange handles month periods', t => {
  const periods = [
    {type: 'month', year: 2024, month: 0}, // January
    {type: 'month', year: 2024, month: 2} // March
  ]

  const result = periodsToDateRange(periods)

  t.truthy(result)
  t.deepEqual(result.start, new Date(2024, 0, 1))
  t.deepEqual(result.end, new Date(2024, 3, 0)) // Last day of March
})

test('periodsToDateRange handles single period', t => {
  const periods = [{type: 'year', value: 2024}]

  const result = periodsToDateRange(periods)

  t.truthy(result)
  t.deepEqual(result.start, new Date(2024, 0, 1))
  t.deepEqual(result.end, new Date(2024, 11, 31))
})

// formatDateRange tests
test('formatDateRange formats date range in French', t => {
  const start = new Date(2024, 0, 1)
  const end = new Date(2024, 11, 31)

  const result = formatDateRange(start, end, 'fr-FR')

  t.true(result.includes('2024'))
  t.true(result.includes('janvier') || result.includes('1'))
  t.true(result.includes('décembre') || result.includes('31'))
})

test('formatDateRange returns empty string for null dates', t => {
  t.is(formatDateRange(null, null), '')
  t.is(formatDateRange(new Date(), null), '')
})

// buildCalendarData tests
test('buildCalendarData returns empty array for empty values', t => {
  const result = buildCalendarData([])
  t.deepEqual(result, [])
})

test('buildCalendarData groups values by month', t => {
  const values = [
    {date: '2024-01-01', values: [10]},
    {date: '2024-01-15', values: [20]},
    {date: '2024-02-01', values: [30]}
  ]

  const result = buildCalendarData(values)

  t.is(result.length, 2) // Two months
  t.is(result[0].length, 2) // Two entries in January
  t.is(result[1].length, 1) // One entry in February
})

test('buildCalendarData assigns colors based on data presence', t => {
  const values = [
    {date: '2024-01-01', values: [10]}, // Has data → dark blue
    {date: '2024-01-02', values: [0]}, // Zero → light blue
    {date: '2024-01-03', values: [null]}, // No data → grey
    {date: '2024-01-04', values: [undefined]}, // No data → grey
    {date: '2024-01-05', values: [10, 0, null]}, // Mixed: has non-zero → dark blue
    {date: '2024-01-06', values: [0, 0, 0]} // All zeros → light blue
  ]

  const result = buildCalendarData(values)

  t.is(result[0][0].color, mockStatusColors.present) // Has data (dark blue)
  t.is(result[0][1].color, mockStatusColors.noSampling) // Zero (light blue)
  t.is(result[0][2].color, mockStatusColors.notDeclared) // Null (grey)
  t.is(result[0][3].color, mockStatusColors.notDeclared) // Undefined (grey)
  t.is(result[0][4].color, mockStatusColors.present) // Mixed with non-zero (dark blue)
  t.is(result[0][5].color, mockStatusColors.noSampling) // All zeros (light blue)
})

test('buildCalendarEntriesFromMetadata generates monthly entries from minDate/maxDate', t => {
  const seriesList = [
    {
      parameter: 'temperature',
      minDate: '2023-01-15',
      maxDate: '2023-03-20',
      color: '#ff0000'
    }
  ]

  const dateRange = {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31')
  }

  const result = buildCalendarEntriesFromMetadata(
    seriesList,
    dateRange,
    date => date.toISOString().split('T')[0],
    mockStatusColors
  )

  // Should generate entries for January, February, March
  t.is(result.length, 3)

  const janEntry = result.find(entry => entry.date === '2023-01-01')
  const febEntry = result.find(entry => entry.date === '2023-02-01')
  const marEntry = result.find(entry => entry.date === '2023-03-01')

  t.truthy(janEntry)
  t.truthy(febEntry)
  t.truthy(marEntry)

  // Should use series color
  t.is(janEntry.color, '#ff0000')
  t.is(janEntry.status, 'present')
  t.is(janEntry.parameter, 'temperature')
})

test('buildCalendarEntriesFromMetadata skips series outside date range', t => {
  const seriesList = [
    {
      parameter: 'temperature',
      minDate: '2022-01-01',
      maxDate: '2022-12-31',
      color: '#ff0000'
    }
  ]

  const dateRange = {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31')
  }

  const result = buildCalendarEntriesFromMetadata(
    seriesList,
    dateRange,
    date => date.toISOString().split('T')[0],
    mockStatusColors
  )

  // Series completely outside range should be skipped
  t.is(result.length, 0)
})

test('buildCalendarEntriesFromMetadata uses default color when series has no color', t => {
  const seriesList = [
    {
      parameter: 'flow',
      minDate: '2023-01-01',
      maxDate: '2023-01-31'
      // No color specified
    }
  ]

  const dateRange = {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31')
  }

  const result = buildCalendarEntriesFromMetadata(
    seriesList,
    dateRange,
    date => date.toISOString().split('T')[0],
    mockStatusColors
  )

  t.is(result.length, 1)
  t.is(result[0].color, mockStatusColors.present) // Default color
})

// filterSeriesByParameters tests
test('filterSeriesByParameters returns empty array for empty selection', t => {
  const series = [
    {id: 'param1', data: []},
    {id: 'param2', data: []}
  ]

  t.deepEqual(filterSeriesByParameters(series, []), [])
  t.deepEqual(filterSeriesByParameters(series, null), [])
})

test('filterSeriesByParameters filters series by selected params', t => {
  const series = [
    {id: 'param1', data: [1, 2, 3]},
    {id: 'param2', data: [4, 5, 6]},
    {id: 'param3', data: [7, 8, 9]}
  ]

  const result = filterSeriesByParameters(series, ['param1', 'param3'])

  t.is(result.length, 2)
  t.is(result[0].id, 'param1')
  t.is(result[1].id, 'param3')
})

// getUniqueUnits tests
test('getUniqueUnits returns unique units from parameters', t => {
  const parameters = [
    {parameter: 'temp', unit: '°C'},
    {parameter: 'pressure', unit: 'bar'},
    {parameter: 'temp2', unit: '°C'},
    {parameter: 'flow', unit: 'm³/h'}
  ]

  const result = getUniqueUnits(parameters)

  t.is(result.length, 3)
  t.true(result.includes('°C'))
  t.true(result.includes('bar'))
  t.true(result.includes('m³/h'))
})

test('getUniqueUnits handles null units', t => {
  const parameters = [
    {parameter: 'param1', unit: 'm³/h'},
    {parameter: 'param2', unit: null},
    {parameter: 'param3', unit: undefined}
  ]

  const result = getUniqueUnits(parameters)

  t.is(result.length, 1)
  t.is(result[0], 'm³/h')
})

test('getUniqueUnits returns empty array for null input', t => {
  t.deepEqual(getUniqueUnits(null), [])
  t.deepEqual(getUniqueUnits(undefined), [])
})

// validateParameterSelection tests
test('validateParameterSelection allows empty selection', t => {
  const parameters = []
  const result = validateParameterSelection([], parameters)

  t.true(result.valid)
  t.is(result.message, undefined)
})

test('validateParameterSelection allows up to 2 units', t => {
  const parameters = [
    {parameter: 'temp', unit: '°C'},
    {parameter: 'pressure', unit: 'bar'}
  ]

  const result = validateParameterSelection(['temp', 'pressure'], parameters)

  t.true(result.valid)
})

test('validateParameterSelection rejects more than 2 units', t => {
  const parameters = [
    {parameter: 'temp', unit: '°C'},
    {parameter: 'pressure', unit: 'bar'},
    {parameter: 'flow', unit: 'm³/h'}
  ]

  const result = validateParameterSelection(['temp', 'pressure', 'flow'], parameters)

  t.false(result.valid)
  t.truthy(result.message)
})

test('validateParameterSelection allows custom max units', t => {
  const parameters = [
    {parameter: 'p1', unit: 'u1'},
    {parameter: 'p2', unit: 'u2'},
    {parameter: 'p3', unit: 'u3'}
  ]

  const result = validateParameterSelection(['p1', 'p2', 'p3'], parameters, 3)

  t.true(result.valid)
})

// clamp tests
test('clamp returns value within range', t => {
  t.is(clamp(5, 0, 10), 5)
  t.is(clamp(-5, 0, 10), 0)
  t.is(clamp(15, 0, 10), 10)
})

test('clamp handles edge cases', t => {
  t.is(clamp(0, 0, 10), 0)
  t.is(clamp(10, 0, 10), 10)
})

// computeSliderMarks tests
test('computeSliderMarks returns empty array for empty dates', t => {
  t.deepEqual(computeSliderMarks([]), [])
  t.deepEqual(computeSliderMarks(null), [])
})

test('computeSliderMarks returns all dates when count is small', t => {
  const dates = [
    new Date(2024, 0, 1),
    new Date(2024, 0, 2),
    new Date(2024, 0, 3)
  ]

  const result = computeSliderMarks(dates, 5)

  t.is(result.length, 3)
  t.is(result[0].value, 0)
  t.is(result[1].value, 1)
  t.is(result[2].value, 2)
})

test('computeSliderMarks decimates marks for large date ranges', t => {
  const dates = Array.from({length: 100}, (_, i) =>
    addDays(startOfDay(new Date(2024, 0, 1)), i))

  const result = computeSliderMarks(dates, 5)

  t.is(result.length, 5)
  t.is(result[0].value, 0)
  t.is(result.at(-1).value, 99) // Always includes last date
  t.truthy(result[0].label)
  t.truthy(result.at(-1).label)
})

test('computeSliderMarks formats labels correctly', t => {
  const dates = [
    new Date(2024, 0, 1),
    new Date(2024, 0, 15)
  ]

  const result = computeSliderMarks(dates)

  t.true(result[0].label.includes('janv') || result[0].label.includes('1'))
  t.true(result[1].label.includes('janv') || result[1].label.includes('15'))
})

// TransformSeriesToData tests
test('transformSeriesToData returns empty for no series', t => {
  const result = transformSeriesToData([])

  t.deepEqual(result.dailyValues, [])
  t.deepEqual(result.dailyParameters, [])
  t.false(result.hasSubDaily)
})

test('transformSeriesToData handles single series with sub-daily values', t => {
  const series = [{
    series: {
      parameter: 'Temp',
      unit: '°C',
      frequency: 'sub-daily',
      hasSubDaily: true,
      color: '#e74c3c'
    },
    values: [
      {
        date: '2024-01-01',
        values: [
          {time: '00:00:00', value: 12.4, remark: null},
          {time: '06:00:00', value: 13.1, remark: null}
        ]
      }
    ]
  }]

  const result = transformSeriesToData(series)

  t.is(result.dailyValues.length, 1)
  t.is(result.dailyValues[0].date, '2024-01-01')
  t.is(result.dailyValues[0].values.length, 1)
  t.is(Math.round(result.dailyValues[0].values[0] * 10) / 10, 12.8) // Average of 12.4 and 13.1
  t.true(result.hasSubDaily)
})

test('transformSeriesToData handles multiple series', t => {
  const series = [
    {
      series: {
        parameter: 'Temp',
        unit: '°C',
        hasSubDaily: false
      },
      values: [{date: '2024-01-01', values: 15}]
    },
    {
      series: {
        parameter: 'Flow',
        unit: 'm³/h',
        hasSubDaily: false
      },
      values: [{date: '2024-01-01', values: 50}]
    }
  ]

  const result = transformSeriesToData(series)

  t.is(result.dailyParameters.length, 2)
  t.is(result.dailyParameters[0].parameter, 'Temp')
  t.is(result.dailyParameters[1].parameter, 'Flow')
  t.is(result.dailyValues.length, 1)
  t.is(result.dailyValues[0].values[0], 15)
  t.is(result.dailyValues[0].values[1], 50)
})

test('transformSeriesToData handles null values by treating them as zero', t => {
  const series = [{
    series: {
      parameter: 'Temp',
      unit: '°C',
      hasSubDaily: true
    },
    values: [
      {
        date: '2024-01-01',
        values: [
          {time: '00:00:00', value: null, remark: null},
          {time: '06:00:00', value: null, remark: null}
        ]
      }
    ]
  }]

  const result = transformSeriesToData(series)

  // The reduce logic (b || 0) treats null values as 0
  // Average of [null, null] → average of [0, 0] → 0
  t.is(result.dailyValues[0].values[0], 0)
})

test('transformSeriesToData handles empty sub-daily values array without division by zero', t => {
  const series = [{
    series: {
      parameter: 'Temperature',
      unit: '°C',
      color: '#ff0000',
      frequency: 'hourly',
      valueType: 'instantaneous',
      hasSubDaily: true
    },
    values: [
      {
        date: '2024-01-01',
        values: [] // Empty array - protected by length check
      }
    ]
  }]

  const result = transformSeriesToData(series)

  t.is(result.dailyValues.length, 1)
  t.is(result.dailyValues[0].date, '2024-01-01')
  // Empty array returns null (not NaN) thanks to: dailyValues.length > 0 ? ... : null
  t.is(result.dailyValues[0].values[0], null)
  t.true(result.hasSubDaily)
})

test('transformSeriesToData preserves zero values correctly', t => {
  const series = [{
    series: {
      parameter: 'Flow',
      unit: 'm³/h',
      color: '#0078f3',
      frequency: 'hourly',
      hasSubDaily: true
    },
    values: [
      {
        date: '2024-01-01',
        values: [
          {time: '00:00:00', value: 0, remark: null},
          {time: '06:00:00', value: 0, remark: null}
        ]
      }
    ]
  }]

  const result = transformSeriesToData(series)

  t.is(result.dailyValues.length, 1)
  // Average of [0, 0] → 0 (real zero measurement, not null)
  t.is(result.dailyValues[0].values[0], 0)
})

/* eslint-enable capitalized-comments */
