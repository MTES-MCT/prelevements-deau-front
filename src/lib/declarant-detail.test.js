import test from 'ava'

import {
  getDeclarantDetailExploitations,
  getDeclarantRole,
  getDeclarantSeriesScope,
  getExploitationPointIds,
  hasDeclarantContactInfo
} from './declarant-detail.js'

test('getDeclarantRole retourne PRELEVEUR par défaut', t => {
  t.is(getDeclarantRole({}), 'PRELEVEUR')
  t.is(getDeclarantRole({declarant: {declarantRole: 'COLLECTEUR'}}), 'COLLECTEUR')
})

test('getDeclarantDetailExploitations garde les exploitations directes pour un préleveur', t => {
  const directExploitation = {
    id: 'exploitation-directe',
    pointPrelevement: {id: 'point-direct'}
  }

  const exploitations = getDeclarantDetailExploitations({
    declarantRole: 'PRELEVEUR',
    pointPrelevements: [directExploitation],
    collecteurExploitations: [
      {
        id: 'lien-collecteur',
        exploitation: {
          id: 'exploitation-collecteur',
          pointPrelevement: {id: 'point-collecteur'}
        }
      }
    ]
  })

  t.deepEqual(exploitations, [directExploitation])
})

test('getDeclarantDetailExploitations expose et déduplique les exploitations gérées par un collecteur', t => {
  const exploitations = getDeclarantDetailExploitations({
    declarantRole: 'COLLECTEUR',
    pointPrelevements: [
      {
        id: 'exploitation-directe',
        pointPrelevementId: 'point-direct'
      }
    ],
    collecteurExploitations: [
      {
        id: 'lien-collecteur-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        exploitation: {
          id: 'exploitation-geree',
          declarant: {socialReason: 'Préleveur A'},
          pointPrelevement: {id: 'point-gere', name: 'PP géré'}
        }
      },
      {
        id: 'lien-collecteur-2',
        exploitation: {
          id: 'exploitation-directe',
          pointPrelevement: {id: 'point-direct', name: 'PP direct'}
        }
      },
      {
        id: 'lien-incomplet'
      }
    ]
  })

  t.deepEqual(
    exploitations.map(exploitation => exploitation.id),
    ['exploitation-directe', 'exploitation-geree']
  )
  t.deepEqual(exploitations[1].collecteurLink, {
    id: 'lien-collecteur-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02'
  })
})

test('getExploitationPointIds accepte les deux formes de point et déduplique', t => {
  t.deepEqual(
    getExploitationPointIds([
      {pointPrelevementId: 'point-1'},
      {pointPrelevement: {id: 'point-2'}},
      {pointPrelevement: {id: 'point-1'}},
      {pointPrelevement: null}
    ]),
    ['point-1', 'point-2']
  )
})

test('getDeclarantSeriesScope utilise le collecteur pour résoudre les exploitations accessibles', t => {
  t.deepEqual(
    getDeclarantSeriesScope({declarantRole: 'COLLECTEUR'}, 'collecteur-1', ['point-1', 'point-2']),
    {collecteurId: 'collecteur-1'}
  )
  t.is(getDeclarantSeriesScope({declarantRole: 'COLLECTEUR'}, null, ['point-1']), null)
  t.deepEqual(
    getDeclarantSeriesScope({declarantRole: 'PRELEVEUR'}, 'preleveur-1', ['point-1']),
    {preleveurId: 'preleveur-1'}
  )
})

test('hasDeclarantContactInfo couvre les coordonnées partielles', t => {
  t.false(hasDeclarantContactInfo({}))
  t.true(hasDeclarantContactInfo({city: 'Saint-Denis'}))
  t.true(hasDeclarantContactInfo({email: 'contact@example.test'}))
})
