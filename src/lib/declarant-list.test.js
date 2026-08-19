import test from 'ava'

import {
  toDeclarantListItem,
  toDeclarantsListResult
} from './declarant-list.js'

const expectedPreleveur = {
  id: 'user-1',
  email: 'contact@example.test',
  civility: 'Mme',
  firstName: 'Alice',
  lastName: 'Martin',
  declarantRole: 'PRELEVEUR',
  declarantType: 'LEGAL_PERSON',
  preleveurType: 'IRRIGANT',
  socialReason: 'Ferme de Beauvert',
  city: 'Beauvert',
  lastDeclarationAt: '2026-07-01T00:00:00.000Z',
  pointCount: 3,
  usages: [{code: '2', label: 'Irrigation'}],
  canReadDetail: true,
  canDisplayPoints: true,
  canDisplayActivity: false
}

test('la projection accepte la réponse historique sans transmettre ses données inutiles', t => {
  const projected = toDeclarantListItem({
    id: 'user-1',
    email: 'contact@example.test',
    firstName: 'Alice',
    lastName: 'Martin',
    password: 'ne-doit-pas-etre-transmis',
    declarant: {
      civility: 'Mme',
      declarantRole: 'PRELEVEUR',
      declarantType: 'LEGAL_PERSON',
      preleveurType: 'IRRIGANT',
      socialReason: 'Ferme de Beauvert',
      city: 'Beauvert',
      lastDeclarationAt: '2026-07-01T00:00:00.000Z',
      _count: {pointPrelevements: 3},
      pointPrelevements: [{id: 'point-1'}]
    },
    searchSummary: {usages: [{code: '2', label: 'Irrigation'}]},
    right: {
      isAdmin: false,
      permissions: [
        'declarant.detail.read',
        'exploitation.list',
        'une.permission.sans.rapport'
      ]
    }
  })

  t.deepEqual(projected, expectedPreleveur)
  t.false(Object.hasOwn(projected, 'right'))
  t.false(Object.hasOwn(projected, 'password'))
  t.false(Object.hasOwn(projected, 'declarant'))
})

test('la projection accepte aussi le contrat compact plat', t => {
  const projected = toDeclarantListItem({
    id: 'user-1',
    email: 'contact@example.test',
    civility: 'Mme',
    firstName: 'Alice',
    lastName: 'Martin',
    declarantRole: 'PRELEVEUR',
    declarantType: 'LEGAL_PERSON',
    preleveurType: 'IRRIGANT',
    socialReason: 'Ferme de Beauvert',
    city: 'Beauvert',
    lastDeclarationAt: '2026-07-01T00:00:00.000Z',
    pointCount: 3,
    usages: [{code: '2', label: 'Irrigation'}],
    canReadDetail: true,
    canDisplayPoints: true,
    canDisplayActivity: false
  })

  t.deepEqual(projected, expectedPreleveur)
})

test('un collecteur utilise son nombre de points accessibles', t => {
  const projected = toDeclarantListItem({
    id: 'user-2',
    declarant: {
      declarantRole: 'COLLECTEUR',
      _count: {pointPrelevements: 2, collecteurExploitations: 12}
    },
    right: {isAdmin: true, permissions: []}
  })

  t.is(projected.pointCount, 12)
  t.false(projected.canReadDetail)
  t.true(projected.canDisplayPoints)
  t.true(projected.canDisplayActivity)
})

test('le résultat destiné au composant conserve seulement le contrat rendu', t => {
  const result = toDeclarantsListResult({
    items: [{id: 'user-1', declarant: {_count: {pointPrelevements: 0}}}],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
    counts: {total: 999},
    facets: {roles: [{value: 'PRELEVEUR', count: 1}]},
    internalTiming: {sql: 125}
  })

  t.deepEqual(Object.keys(result).sort(), [
    'facets',
    'items',
    'page',
    'pageSize',
    'total',
    'totalPages'
  ])
  t.is(result.items[0].id, 'user-1')
})
