import test from 'ava'

import {keepActiveIndexInRenderedRange} from './virtualized-list.js'

test('conserve un index actif monté dans la fenêtre virtualisée', t => {
  t.is(keepActiveIndexInRenderedRange(12, 10, 20), 12)
})

test('recale un index actif démonté sur la fenêtre virtualisée', t => {
  t.is(keepActiveIndexInRenderedRange(2, 10, 20), 10)
  t.is(keepActiveIndexInRenderedRange(30, 10, 20), 20)
})

test('attend une fenêtre virtualisée mesurée', t => {
  t.is(keepActiveIndexInRenderedRange(4, undefined, undefined), 4)
})
