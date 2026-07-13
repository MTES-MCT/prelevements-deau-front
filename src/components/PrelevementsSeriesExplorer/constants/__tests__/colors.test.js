import test from 'ava'

import {getParameterFlowColor} from '../colors.js'

test('getParameterFlowColor keeps distinct colors for withdrawals and discharges', t => {
  t.is(getParameterFlowColor('volume', 'PRELEVEMENT'), '#000091')
  t.is(getParameterFlowColor('volume', 'REJET'), '#CE614A')
  t.not(
    getParameterFlowColor('index', 'PRELEVEMENT'),
    getParameterFlowColor('index', 'REJET')
  )
})
