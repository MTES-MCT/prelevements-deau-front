import test from 'ava'

import {SMART_SEARCH_DEBOUNCE_MS} from './search-timing.js'

test('les recherches intelligentes sont déclenchées après 200 ms', t => {
  t.is(SMART_SEARCH_DEBOUNCE_MS, 200)
})
