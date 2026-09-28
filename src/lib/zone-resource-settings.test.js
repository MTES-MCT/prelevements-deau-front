import test from 'ava'

import {canViewSageSettings, isManagedResourceType, MANAGED_RESOURCE_TYPES} from './zone-resource-settings.js'

test('les quatre types de ressource sont explicites, sans valeur vide assimilée à mixte', t => {
  t.deepEqual(MANAGED_RESOURCE_TYPES.map(option => option.value), ['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION', 'MIXTE'])
  for (const option of MANAGED_RESOURCE_TYPES) t.true(isManagedResourceType(option.value))
  for (const value of ['', null, undefined, 'NAPPE', 'mixte']) t.false(isManagedResourceType(value))
})

test('les paramètres du SAGE ne sont accessibles que sur un SAGE consultable', t => {
  t.true(canViewSageSettings({type: 'SAGE', permissions: ['zone.detail.read']}))
  t.false(canViewSageSettings({type: 'SAGE', permissions: ['pp.list']}))
  for (const type of ['REGION', 'DEPARTEMENT', undefined]) {
    t.false(canViewSageSettings({type, permissions: ['zone.detail.read']}))
  }
  t.false(canViewSageSettings(null))
})
