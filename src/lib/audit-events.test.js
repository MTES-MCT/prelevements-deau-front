import test from 'ava'

import {
  buildAuditSearchParameters,
  getAuditPeriodPresets,
  getDefaultAuditDateRange,
  isAuditPresetActive,
  normalizeAuditFilters
} from '@/lib/audit-events.js'

const TODAY = '2026-08-10'

test('getDefaultAuditDateRange couvre trente jours inclusifs', t => {
  t.deepEqual(getDefaultAuditDateRange(TODAY), {
    from: '2026-07-12',
    to: TODAY
  })
})

test('normalizeAuditFilters valide pagination, listes et périodes spéciales', t => {
  const filters = normalizeAuditFilters({
    actor: 'Samy',
    subject: 'Nathalie',
    period: '24h',
    actionTypes: 'AUTH.LOGOUT,AUTH.LOGOUT,POINT.UPDATED',
    outcomes: 'SUCCESS,DENIED',
    page: '3',
    pageSize: '50'
  }, {today: TODAY})

  t.deepEqual(filters.actionTypes, ['AUTH.LOGOUT', 'POINT.UPDATED'])
  t.deepEqual(filters.outcomes, ['SUCCESS', 'DENIED'])
  t.is(filters.period, '24h')
  t.is(filters.page, 3)
  t.is(filters.pageSize, 50)
})

test('buildAuditSearchParameters omet les valeurs par défaut inutiles', t => {
  const filters = normalizeAuditFilters({}, {today: TODAY})
  const parameters = buildAuditSearchParameters(filters)

  t.is(parameters.get('from'), '2026-07-12')
  t.is(parameters.get('to'), TODAY)
  t.false(parameters.has('page'))
  t.false(parameters.has('pageSize'))
})

test('les périodes rapides identifient correctement la sélection active', t => {
  const presets = getAuditPeriodPresets(TODAY)
  const filters = normalizeAuditFilters({}, {today: TODAY})

  t.true(isAuditPresetActive(presets.find(preset => preset.key === '30d'), filters))
  t.false(isAuditPresetActive(presets.find(preset => preset.key === '24h'), filters))
})
