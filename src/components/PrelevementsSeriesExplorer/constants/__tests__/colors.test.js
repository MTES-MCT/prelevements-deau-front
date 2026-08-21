import test from 'ava'

import {
  getParameterFlowColor,
  PARAMETER_FLOW_COLOR_MAP
} from '../colors.js'

test('getParameterFlowColor keeps distinct colors for withdrawals and discharges', t => {
  t.is(getParameterFlowColor('volume', 'PRELEVEMENT'), '#000091')
  t.not(
    getParameterFlowColor('index', 'PRELEVEMENT'),
    getParameterFlowColor('index', 'REJET')
  )
})

test('getParameterFlowColor returns concrete colors for discharge charts', t => {
  for (const metricTypeCode of ['volume', 'index', 'debit']) {
    t.is(getParameterFlowColor(metricTypeCode, 'REJET'), '#CE614A')
  }
})

test('all parameter flow colors are concrete hexadecimal colors', t => {
  for (const [key, color] of PARAMETER_FLOW_COLOR_MAP) {
    t.regex(color, /^#[\da-f]{6}$/i, `Invalid chart color for ${key}`)
  }
})
