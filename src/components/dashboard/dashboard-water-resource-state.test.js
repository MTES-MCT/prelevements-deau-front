import test from 'ava'

import {
  buildResourceHash,
  DEFAULT_FLOW_PERIOD,
  DEFAULT_PIEZOMETRY_MODE,
  DEFAULT_PIEZOMETRY_PERIOD,
  getInitialResourceState,
  readResourceHash,
  shouldHideEmptyWaterResources
} from './dashboard-water-resource-state.js'

const DEFAULT_STATE = {
  flowPeriod: DEFAULT_FLOW_PERIOD,
  piezometryMode: DEFAULT_PIEZOMETRY_MODE,
  piezometryPeriod: DEFAULT_PIEZOMETRY_PERIOD
}

test('le hash utilise par défaut l’écart à la normale annuel', t => {
  t.deepEqual(readResourceHash('#dashboard?'), DEFAULT_STATE)
})

test('le chargement différé utilise les périodes par défaut sans hash', t => {
  t.deepEqual(getInitialResourceState(''), DEFAULT_STATE)
})

test('le chargement différé restaure les périodes demandées dans le hash', t => {
  t.deepEqual(getInitialResourceState('#dashboard?piezoMode=depth&flowPeriod=month'), {
    flowPeriod: 'month',
    piezometryMode: 'depth',
    piezometryPeriod: 'month'
  })
})

test('les ressources en eau conservent leur état de chargement différé visible', t => {
  t.false(shouldHideEmptyWaterResources({
    flowError: null,
    hasAnyStation: false,
    isFlowLoading: true,
    isPiezometryLoading: true,
    piezometryError: null
  }))
})

test('les ressources en eau vides disparaissent une fois les chargements terminés', t => {
  t.true(shouldHideEmptyWaterResources({
    flowError: null,
    hasAnyStation: false,
    isFlowLoading: false,
    isPiezometryLoading: false,
    piezometryError: null
  }))
})

test('un choix piézométrique explicite est restauré', t => {
  t.deepEqual(readResourceHash('#dashboard?piezoMode=depth'), {
    flowPeriod: 'week',
    piezometryMode: 'depth',
    piezometryPeriod: 'month'
  })
})

test('une période IPS incompatible revient à la période annuelle', t => {
  t.deepEqual(readResourceHash('#dashboard?piezoPeriod=month'), DEFAULT_STATE)
})

test('le hash omet les valeurs par défaut et conserve les filtres du tableau de bord', t => {
  t.is(
    buildResourceHash('#dashboard?periodType=week&piezoMode=depth', DEFAULT_STATE),
    '#dashboard?periodType=week'
  )
})

test('le hash conserve et restaure un mode brut explicite', t => {
  const state = {
    flowPeriod: 'month',
    piezometryMode: 'level',
    piezometryPeriod: 'five-years'
  }
  const hash = buildResourceHash('', state)

  t.deepEqual(readResourceHash(hash), state)
})
