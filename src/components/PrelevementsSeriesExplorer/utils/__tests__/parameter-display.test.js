import test from 'ava'

import {formatValueTypeLabel} from '../parameter-display.js'

test('formatValueTypeLabel francise les types de valeur métier', t => {
  t.is(formatValueTypeLabel('cumulative'), 'Cumulée sur période')
  t.is(formatValueTypeLabel('instantaneous'), 'Ponctuelle')
})

test('formatValueTypeLabel normalise la valeur technique', t => {
  t.is(formatValueTypeLabel(' CUMULATIVE '), 'Cumulée sur période')
  t.is(formatValueTypeLabel(' INSTANTANEOUS '), 'Ponctuelle')
})

test('formatValueTypeLabel conserve les valeurs de repli', t => {
  t.is(formatValueTypeLabel('unknown'), 'brut')
  t.is(formatValueTypeLabel(null), null)
})
