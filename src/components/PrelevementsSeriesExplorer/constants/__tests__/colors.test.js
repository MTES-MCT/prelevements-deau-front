import test from 'ava'

import {getParameterFlowColor} from '../colors.js'

import {pointFlowTypeColors} from '@/lib/point-flow-types.js'

test('getParameterFlowColor keeps distinct colors for withdrawals and discharges', t => {
  t.is(getParameterFlowColor('volume', 'PRELEVEMENT'), '#000091')
  t.is(getParameterFlowColor('volume', 'REJET'), pointFlowTypeColors.REJET.accentColor)
  t.not(
    getParameterFlowColor('index', 'PRELEVEMENT'),
    getParameterFlowColor('index', 'REJET')
  )
  t.is(getParameterFlowColor('index', 'REJET'), pointFlowTypeColors.REJET.accentColor)
  t.is(getParameterFlowColor('debit', 'REJET'), pointFlowTypeColors.REJET.accentColor)
})
