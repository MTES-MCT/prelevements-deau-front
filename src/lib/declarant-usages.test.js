import test from 'ava'

import {getDeclarantUsageSummary} from './declarant-usages.js'

test('le résumé limite les usages et annonce le nombre restant', t => {
  t.deepEqual(getDeclarantUsageSummary([
    {code: '2', label: 'Irrigation'},
    {code: '5', label: 'Alimentation en eau potable'},
    {code: '4', label: 'Industrie'},
    {code: '7', label: 'Loisirs'}
  ]), {
    visibleUsages: [
      {code: '2', label: 'Irrigation'},
      {code: '5', label: 'Alimentation en eau potable'}
    ],
    remainingCount: 2
  })
})

test('le résumé déduplique les codes et tolère les données absentes', t => {
  t.deepEqual(getDeclarantUsageSummary([
    {code: '2', label: 'Irrigation'},
    {code: '2', label: 'Irrigation dupliquée'},
    null,
    {code: '', label: 'Invalide'}
  ]), {
    visibleUsages: [{code: '2', label: 'Irrigation'}],
    remainingCount: 0
  })
  t.deepEqual(getDeclarantUsageSummary(null), {
    visibleUsages: [],
    remainingCount: 0
  })
})
