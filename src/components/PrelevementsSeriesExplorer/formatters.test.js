import test from 'ava'

import {formatSliderMark, formatSliderValue} from './formatters.js'

test('slider formatters always expose an exact day, including for coarse resolutions', t => {
  const date = new Date(2025, 10, 2)

  t.is(formatSliderMark(date, '1 month', 'fr-FR'), '02/11/2025')
  t.is(formatSliderValue(date, '1 year', 'fr-FR'), '02/11/2025')
})
