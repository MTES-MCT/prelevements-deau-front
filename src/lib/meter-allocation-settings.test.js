import test from 'ava'
import {buildAllocationUpdate, getAllocationTotal, getDefaultAllocationDate, percentageToUnits} from './meter-allocation-settings.js'

const settings = {stream: {id: 'stream'}, expectedVersion: 'snapshot', minEffectiveDate: '2026-09-18'}
const values = {
  effectiveDate: '2026-09-18', reason: 'Nouveau partage validé',
  allocations: [{key: 'a', exploitationId: 'target', percentage: '33.3333', additive: true}, {key: 'external', exploitationId: null, percentage: '66,6667', additive: false}]
}

test('répartition complète exacte, parts externes et version optimiste conservées', t => {
  const payload = buildAllocationUpdate(settings, values)
  t.is(getAllocationTotal(values.allocations), 1_000_000)
  t.is(payload.allocations[1].percentage, '66.6667')
  t.is(payload.allocations[1].exploitationId, null)
  t.true(payload.allocations[0].additive)
  t.is(payload.expectedVersion, 'snapshot')
  t.is(payload.streamId, 'stream')
  t.is(payload.allocations[0].key, 'a')
})

test('valeurs invalides, somme, date passée, motif et rattachement absent refusés', t => {
  for (const percentage of ['-1', '101', 'NaN', '1e2', '33.33333', '']) t.is(percentageToUnits(percentage), null)
  t.is(percentageToUnits('0'), 0)
  t.throws(() => buildAllocationUpdate(settings, {...values, allocations: [{exploitationId: null, percentage: '70'}]}), {message: /100/})
  t.throws(() => buildAllocationUpdate(settings, {...values, effectiveDate: '2026-09-17'}), {message: /date/})
  t.throws(() => buildAllocationUpdate(settings, {...values, reason: '  '}), {message: /motif/})
  t.throws(() => buildAllocationUpdate(settings, {...values, allocations: [{exploitationId: null, percentage: '100'}]}), {message: /Au moins/})
  t.throws(() => buildAllocationUpdate(settings, {...values, effectiveDate: '2026-09-31'}), {message: /date/})
  t.is(buildAllocationUpdate(settings, {...values, allocations: values.allocations.map(allocation => ({...allocation, exploitationId: 'same'}))}).allocations.length, 2)
  t.throws(() => buildAllocationUpdate(settings, {...values, allocations: values.allocations.map(allocation => ({...allocation, inScope: true}))}), {message: /manquante/})
  t.is(getDefaultAllocationDate('2026-09-18', new Date('2026-09-17T08:00:00Z')), '2026-09-18')
  t.is(getDefaultAllocationDate('2026-09-16', new Date('2026-09-16T22:30:00Z')), '2026-09-17')
})
