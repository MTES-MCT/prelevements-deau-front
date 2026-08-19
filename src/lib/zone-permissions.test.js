import test from 'ava'

import {
  addPermissionWithDependencies,
  hasRequiredZonePermissions,
  removePermissionWithDependents
} from './zone-permissions.js'

const catalog = new Map([
  ['zone.detail.read', {requires: []}],
  ['declarant.list', {requires: ['zone.detail.read']}],
  ['declarant.detail.read', {requires: ['declarant.list']}],
  ['declarant.document.read', {requires: ['declarant.detail.read']}],
  ['declarant.document.update', {requires: ['declarant.document.read']}]
])

test('ajoute récursivement les dépendances d’un droit', t => {
  t.deepEqual(
    addPermissionWithDependencies([], 'declarant.document.update', catalog),
    [
      'declarant.document.update',
      'declarant.document.read',
      'declarant.detail.read',
      'declarant.list',
      'zone.detail.read'
    ]
  )
})

test('retire récursivement les droits devenus incohérents', t => {
  const selected = [...catalog.keys()]

  t.deepEqual(
    removePermissionWithDependents(selected, 'declarant.detail.read', catalog),
    ['zone.detail.read', 'declarant.list']
  )
})

test('masque les filtres métier sans les droits de zone nécessaires', t => {
  t.true(hasRequiredZonePermissions(['pp.list'], []))
  t.false(hasRequiredZonePermissions(['pp.list'], ['exploitation.list']))
  t.true(hasRequiredZonePermissions(
    ['pp.list', 'exploitation.list'],
    ['exploitation.list']
  ))
  t.false(hasRequiredZonePermissions(
    ['exploitation.list'],
    ['exploitation.list', 'declarant.list'],
    {requireAll: true}
  ))
  t.true(hasRequiredZonePermissions(
    ['exploitation.list', 'declarant.list'],
    ['exploitation.list', 'declarant.list'],
    {requireAll: true}
  ))
})
