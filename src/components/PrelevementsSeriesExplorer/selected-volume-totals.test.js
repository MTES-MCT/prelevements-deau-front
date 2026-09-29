import test from 'ava'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import {
  getSelectedVolumeParameters,
  loadSelectedVolumeTotals,
  normalizeVolumeTotalRange,
  sumVolumeValues
} from './selected-volume-totals.js'
import {useSelectedVolumeTotals} from './use-selected-volume-totals.js'

// Initial-render checks need no additional hook-testing dependency. Browser
// coverage exercises effects, range commitments and racing network responses.
function renderInitialTotals(props) {
  let totals

  function Snapshot() {
    totals = useSelectedVolumeTotals(props)
    return null
  }

  renderToStaticMarkup(createElement(Snapshot))
  return totals
}

test('totals include only selected withdrawal and discharge volume metrics', t => {
  const parameters = [
    {value: 'withdrawn', metricTypeCode: 'volume', flowType: 'PRELEVEMENT', color: '#000091'},
    {value: 'discharged', metricTypeCode: 'volume', flowType: 'REJET', color: '#ce614a'},
    {value: 'index', metricTypeCode: 'index', flowType: 'PRELEVEMENT', unit: 'm³'},
    {value: 'flow', metricTypeCode: 'débit', flowType: 'PRELEVEMENT'},
    {value: 'level', metricTypeCode: 'niveau piézométrique'},
    {value: 'unknown-volume', metricTypeCode: 'volume'},
    {value: 'unselected', metricTypeCode: 'volume', flowType: 'PRELEVEMENT'}
  ]

  t.deepEqual(getSelectedVolumeParameters(parameters, parameters.slice(0, -1).map(({value}) => value)), [
    {parameterId: 'withdrawn', label: 'Total prélevé', color: '#000091'},
    {parameterId: 'discharged', label: 'Total rejeté', color: '#ce614a'}
  ])
})

test('a selected parameter is not counted twice', t => {
  const parameter = {value: 'volume', metricTypeCode: 'volume', flowType: 'PRELEVEMENT'}
  t.is(getSelectedVolumeParameters([parameter, parameter], ['volume', 'volume']).length, 1)
})

test('ranges keep inclusive date-only bounds and local Date values', t => {
  t.deepEqual(normalizeVolumeTotalRange({start: '2026-06-03', end: '2026-06-03'}), {
    startDate: '2026-06-03', endDate: '2026-06-03'
  })
  t.deepEqual(normalizeVolumeTotalRange({start: new Date(2026, 5, 3), end: new Date(2026, 5, 12, 23, 59)}), {
    startDate: '2026-06-03', endDate: '2026-06-12'
  })
})

test('incomplete, invalid and reversed ranges are rejected', t => {
  for (const range of [
    null,
    {},
    {start: null, end: '2026-06-03'},
    {start: 'invalid', end: '2026-06-03'},
    {start: '2026-02-30', end: '2026-03-03'},
    {start: new Date('invalid'), end: '2026-06-03'},
    {start: '2026-06-04', end: '2026-06-03'}
  ]) {
    t.is(normalizeVolumeTotalRange(range), null)
  }
})

test('zero is a valid total, while absent data is not zero', t => {
  t.deepEqual(sumVolumeValues([{date: '2026-06-03', value: 0}]), {status: 'ready', value: 0})
  t.deepEqual(sumVolumeValues([]), {status: 'empty', value: null})
  t.deepEqual(sumVolumeValues([{value: null}, {}, {value: NaN}, {value: Infinity}, {value: '123'}]), {
    status: 'empty', value: null
  })
  t.deepEqual(sumVolumeValues(null), {status: 'error', value: null})
  t.deepEqual(sumVolumeValues(undefined), {status: 'error', value: null})
})

test('raw numeric buckets are summed without intermediate rounding or chart endpoints', t => {
  t.deepEqual(sumVolumeValues([
    {date: '2026-01', value: 10.25},
    {date: '2026-02', value: 20.25},
    {date: '2026-03', value: null},
    {x: new Date(2026, 2, 31), y: 20.25, synthetic: true}
  ]), {status: 'ready', value: 30.5})
  t.deepEqual(sumVolumeValues([{value: Number.MAX_VALUE}, {value: Number.MAX_VALUE}]), {
    status: 'error', value: null
  })
})

test('independent withdrawal and discharge totals use the exact committed range', async t => {
  const range = {startDate: '2026-06-03', endDate: '2026-06-12'}
  const calls = []
  const totals = await loadSelectedVolumeTotals(['withdrawn', 'discharged'], range, async (parameterId, bounds) => {
    calls.push({parameterId, bounds})
    // The API prorates 45,000 m³ / 45 days to these 10 selected days.
    return [{date: '2026', value: parameterId === 'withdrawn' ? 10000 : 0}]
  })

  t.deepEqual(calls, [
    {parameterId: 'withdrawn', bounds: range},
    {parameterId: 'discharged', bounds: range}
  ])
  t.deepEqual(totals.get('withdrawn'), {status: 'ready', value: 10000})
  t.deepEqual(totals.get('discharged'), {status: 'ready', value: 0})
})

test('a failed or malformed total does not discard another flow', async t => {
  const totals = await loadSelectedVolumeTotals(['valid', 'failed', 'malformed', 'empty'], {
    startDate: '2026-06-03', endDate: '2026-06-12'
  }, async parameterId => {
    if (parameterId === 'failed') {
      throw new Error('Network failure')
    }

    return parameterId === 'malformed' ? null : parameterId === 'empty' ? [] : [{value: 100}]
  })

  t.deepEqual(totals.get('valid'), {status: 'ready', value: 100})
  t.deepEqual(totals.get('failed'), {status: 'error', value: null})
  t.deepEqual(totals.get('malformed'), {status: 'error', value: null})
  t.deepEqual(totals.get('empty'), {status: 'empty', value: null})
})

const fullRange = {start: '2026-01-01', end: '2026-12-31'}
const hookProps = {
  parameters: [{value: 'withdrawn', metricTypeCode: 'volume', flowType: 'PRELEVEMENT', color: '#000091'}],
  selectedParameters: ['withdrawn'],
  fullRange,
  selectedRange: fullRange,
  committedRange: fullRange,
  seriesMap: new Map([['withdrawn', {values: [{value: 100.25}, {value: 200.25}]}]])
}

test('the complete-range hook reads raw loaded volume values immediately', t => {
  t.deepEqual(renderInitialTotals(hookProps), [{
    parameterId: 'withdrawn',
    label: 'Total prélevé',
    color: '#000091',
    status: 'ready',
    value: 300.5
  }])
})

test('the hook hides loaded full-range values while loading a new source', t => {
  const [total] = renderInitialTotals({...hookProps, isLoading: true})
  t.is(total.status, 'loading')
  t.is(total.value, null)
})

test('a full-range error or missing series cannot become a misleading zero', t => {
  for (const props of [
    {...hookProps, error: 'Network failure'},
    {...hookProps, seriesMap: new Map()}
  ]) {
    const [total] = renderInitialTotals(props)
    t.is(total.status, 'error')
    t.is(total.value, null)
  }
})

test('the hook hides the committed total while visible bounds are changing', t => {
  const [total] = renderInitialTotals({
    ...hookProps,
    selectedRange: {start: '2026-06-03', end: '2026-06-12'}
  })
  t.is(total.status, 'loading')
  t.is(total.value, null)
})

test('a refined range waits for its exact API sum rather than using full-range buckets', t => {
  const selectedRange = {start: '2026-06-03', end: '2026-06-12'}
  const [total] = renderInitialTotals({
    ...hookProps,
    selectedRange,
    committedRange: selectedRange,
    getVolumeValuesForRange: async () => [{value: 10}]
  })
  t.is(total.status, 'loading')
  t.is(total.value, null)
})
