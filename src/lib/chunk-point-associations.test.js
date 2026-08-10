import test from 'ava'

import {
  POINT_ASSOCIATION_ORIGINS,
  canChangeChunkPointAssociation,
  getChunkPointAssociationOrigin
} from './chunk-point-associations.js'

test('getChunkPointAssociationOrigin utilise le contrat API', t => {
  t.is(getChunkPointAssociationOrigin({pointPrelevementId: null}), null)
  t.is(getChunkPointAssociationOrigin({
    pointPrelevementId: 'point-1',
    pointAssociationOrigin: 'AUTOMATIC'
  }), POINT_ASSOCIATION_ORIGINS.AUTOMATIC)
  t.is(getChunkPointAssociationOrigin({
    pointPrelevementId: 'point-1',
    pointAssociationOrigin: 'MANUAL'
  }), POINT_ASSOCIATION_ORIGINS.MANUAL)
})

test('getChunkPointAssociationOrigin reste compatible avec les anciennes réponses API', t => {
  t.is(getChunkPointAssociationOrigin({
    pointPrelevementId: 'point-1',
    parsingInfo: {reconciledAt: '2026-07-01T10:00:00.000Z'}
  }), POINT_ASSOCIATION_ORIGINS.MANUAL)
  t.is(getChunkPointAssociationOrigin({
    pointPrelevementId: 'point-1',
    parsingInfo: {reason: 'POINT_FOUND_AND_LINK_ACTIVE_ON_WINDOW'}
  }), POINT_ASSOCIATION_ORIGINS.AUTOMATIC)
})

test('canChangeChunkPointAssociation ne rend modifiables que les associations manuelles ou absentes', t => {
  t.true(canChangeChunkPointAssociation({pointPrelevementId: null}))
  t.true(canChangeChunkPointAssociation({
    pointPrelevementId: 'point-1',
    pointAssociationOrigin: 'MANUAL'
  }))
  t.false(canChangeChunkPointAssociation({
    pointPrelevementId: 'point-1',
    pointAssociationOrigin: 'AUTOMATIC'
  }))
})
