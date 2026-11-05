import test from 'ava'

import {resolveSelectedParametersDateRange} from './series-date-range.js'

const parameters = [
  {
    id: 'volume',
    minDate: '2024-12-01',
    maxDate: '2025-11-02'
  },
  {
    id: 'index',
    minDate: '2026-06-26',
    maxDate: '2026-06-26'
  }
]

test('resolveSelectedParametersDateRange only uses selected parameters', t => {
  t.deepEqual(
    resolveSelectedParametersDateRange({parameters, selectedParameters: ['volume']}),
    {start: '2024-12-01', end: '2025-11-02'}
  )

  t.deepEqual(
    resolveSelectedParametersDateRange({parameters, selectedParameters: ['volume', 'index']}),
    {start: '2024-12-01', end: '2026-06-26'}
  )
})

test('resolveSelectedParametersDateRange gives each explicit bound priority', t => {
  t.deepEqual(
    resolveSelectedParametersDateRange({
      parameters,
      selectedParameters: ['volume'],
      startDate: '2025-01-01'
    }),
    {start: '2025-01-01', end: '2025-11-02'}
  )

  t.deepEqual(
    resolveSelectedParametersDateRange({
      parameters,
      selectedParameters: ['volume'],
      endDate: '2025-06-30'
    }),
    {start: '2024-12-01', end: '2025-06-30'}
  )
})

test('resolveSelectedParametersDateRange keeps an exploitation start after the last known reading', t => {
  const startDate = '2026-10-26T00:00:00.000Z'
  t.deepEqual(resolveSelectedParametersDateRange({parameters, selectedParameters: ['index'], startDate}), {
    start: startDate, end: startDate
  })
})

test('resolveSelectedParametersDateRange keeps an exploitation end before the first known reading', t => {
  const endDate = '2026-01-01T00:00:00.000Z'
  t.deepEqual(resolveSelectedParametersDateRange({parameters, selectedParameters: ['index'], endDate}), {
    start: endDate, end: endDate
  })
})

test('resolveSelectedParametersDateRange leaves two reversed explicit bounds for validation', t => {
  t.deepEqual(resolveSelectedParametersDateRange({parameters, startDate: '2026-10-26', endDate: '2026-01-01'}), {
    start: '2026-10-26', end: '2026-01-01'
  })
})

test('resolveSelectedParametersDateRange falls back to all parameters for an unknown selection', t => {
  t.deepEqual(
    resolveSelectedParametersDateRange({
      parameters,
      selectedParameters: ['unknown']
    }),
    {start: '2024-12-01', end: '2026-06-26'}
  )
})

test('resolveSelectedParametersDateRange falls back when the selected parameter has no usable bounds', t => {
  t.deepEqual(
    resolveSelectedParametersDateRange({
      parameters: [
        {id: 'volume', minDate: 'not-a-date', maxDate: null},
        {id: 'index', minDate: '2026-06-26', maxDate: '2026-06-26'}
      ],
      selectedParameters: ['volume']
    }),
    {start: '2026-06-26', end: '2026-06-26'}
  )
})
