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
