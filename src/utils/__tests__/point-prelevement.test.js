import test from 'ava'

import {
  getPointPrelevementLabel,
  getPointPrelevementName,
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

test('normalizePointId retourne une chaîne ou null', t => {
  t.is(normalizePointId('point-id'), 'point-id')
  t.is(normalizePointId(42), '42')
  t.is(normalizePointId(''), null)
  t.is(normalizePointId(null), null)
  t.is(normalizePointId(undefined), null)
})
