import test from 'ava'

import {
  getPointPrelevementDisplayName,
  getPointPrelevementLabel,
  getPointPrelevementName,
  getPointPrelevementTechnicalReference,
  normalizePointId
} from '../point-prelevement.js'

test('getPointPrelevementName privilégie le nom puis les autres noms', t => {
  t.is(getPointPrelevementName({name: 'Forage A', otherNames: 'Ancien nom'}), 'Forage A')
  t.is(getPointPrelevementName({otherNames: 'Ancien nom'}), 'Ancien nom')
  t.is(getPointPrelevementName(null), '')
})

test('getPointPrelevementLabel applique un fallback métier', t => {
  t.is(getPointPrelevementLabel({pointPrelevement: {name: 'Forage A'}}), 'Forage A')
  t.is(getPointPrelevementLabel({pointPrelevement: {}, fallback: 'Point inconnu'}), 'Point inconnu')
  t.is(getPointPrelevementLabel({pointPrelevement: {}}), 'Point de prélèvement')
})

test('getPointPrelevementDisplayName privilégie explicitement le nom d’usage', t => {
  const point = {name: '36-4=1234', usageName: ' Forage de la source '}

  t.is(getPointPrelevementDisplayName(point), '36-4=1234')
  t.is(getPointPrelevementDisplayName(point, {preferUsageName: true}), 'Forage de la source')
})

test('getPointPrelevementDisplayName revient au nom technique si le nom d’usage est vide', t => {
  t.is(
    getPointPrelevementDisplayName(
      {name: '36-4=1234', usageName: '   '},
      {preferUsageName: true}
    ),
    '36-4=1234'
  )
})

test('getPointPrelevementTechnicalReference évite de répéter le nom affiché', t => {
  t.is(
    getPointPrelevementTechnicalReference(
      {name: '36-4=1234', usageName: 'Forage de la source'},
      {preferUsageName: true}
    ),
    '36-4=1234'
  )
  t.is(
    getPointPrelevementTechnicalReference(
      {name: '36-4=1234', usageName: null},
      {preferUsageName: true}
    ),
    null
  )
})

test('normalizePointId retourne une chaîne ou null', t => {
  t.is(normalizePointId('point-id'), 'point-id')
  t.is(normalizePointId(42), '42')
  t.is(normalizePointId(''), null)
  t.is(normalizePointId(null), null)
  t.is(normalizePointId(undefined), null)
})
