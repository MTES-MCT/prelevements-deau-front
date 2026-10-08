import test from 'ava'
import {canConfigureCollectorPointManagement, collectorManagementHasChanges, collectorManagementZoneOptions} from './collector-point-management.js'

test('habilitation visible uniquement à un administrateur direct sur un collecteur actif', t => {
  const collector = {declarantRole: 'COLLECTEUR'}
  t.true(canConfigureCollectorPointManagement({role: 'ADMIN'}, collector))
  t.false(canConfigureCollectorPointManagement({role: 'INSTRUCTOR'}, collector))
  t.false(canConfigureCollectorPointManagement({role: 'DECLARANT'}, collector))
  t.false(canConfigureCollectorPointManagement({role: 'ADMIN', impersonation: {active: true}}, collector))
  t.false(canConfigureCollectorPointManagement({role: 'ADMIN'}, {declarantRole: 'PRELEVEUR'}))
  t.false(canConfigureCollectorPointManagement({role: 'ADMIN'}, {...collector, deletedAt: '2026-01-01'}))
})

test('les zones gardent leur sélection sans doublon ni code technique affiché', t => {
  const department = {id: 'dep', type: 'DEPARTEMENT', name: 'Département', code: 'dep-47'}
  const sage = {id: 'sage', type: 'SAGE', name: 'SAGE synthétique', code: 'sage-test'}
  const region = {id: 'reg', type: 'REGION', name: 'Région'}
  t.deepEqual(collectorManagementZoneOptions([sage, region, department], [sage]), [
    {label: 'Régions', options: [{value: 'reg', label: 'Région', content: 'Région'}]},
    {label: 'Départements', options: [{value: 'dep', label: 'Département', content: 'Département'}]},
    {label: 'SAGE', options: [{value: 'sage', label: 'SAGE synthétique', content: 'SAGE synthétique'}]}
  ])
})

test('un ordre différent ne provoque pas d’écriture et la révocation garde les zones', t => {
  const saved = {enabled: true, zoneIds: ['a', 'b']}
  t.false(collectorManagementHasChanges({enabled: true, zoneIds: ['b', 'a']}, saved))
  t.true(collectorManagementHasChanges({enabled: false, zoneIds: ['a', 'b']}, saved))
  t.true(collectorManagementHasChanges({enabled: true, zoneIds: ['b']}, saved))
})
