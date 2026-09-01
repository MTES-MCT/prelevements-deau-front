import test from 'ava'

import {
  formatSliderMark,
  formatSliderRange,
  formatSliderRangeDate,
  formatSliderValue
} from './formatters.js'

test('slider formatters always expose an exact day, including for coarse resolutions', t => {
  const date = new Date(2025, 10, 2)

  t.is(formatSliderMark(date, '1 month', 'fr-FR'), '02/11/2025')
  t.is(formatSliderValue(date, '1 year', 'fr-FR'), '02/11/2025')
})

test('slider range formatter exposes a concise human-readable period', t => {
  const start = new Date(2023, 0, 31)
  const end = new Date(2025, 11, 30)

  t.is(formatSliderRangeDate(start), '31 janv. 2023')
  t.is(formatSliderRange(start, end), '31 janv. 2023 – 30 déc. 2025')
})
