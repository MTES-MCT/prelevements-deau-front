import test from 'ava'

import {
  getIsolatedStationId,
  toggleStationIsolation
} from './station-visibility.js'

const stations = [{id: 'a'}, {id: 'b'}, {id: 'c'}]

test('la cible isole une série lorsque plusieurs sont affichées', t => {
  t.deepEqual(toggleStationIsolation(stations, {a: true, b: true, c: true}, 'b'), {
    a: false,
    b: true,
    c: false
  })
})

test('un second clic sur la série isolée réaffiche toutes les séries', t => {
  const visibility = {a: false, b: true, c: false}

  t.is(getIsolatedStationId(stations, visibility), 'b')
  t.deepEqual(toggleStationIsolation(stations, visibility, 'b'), {
    a: true,
    b: true,
    c: true
  })
})

test('cliquer sur une autre cible déplace l’isolation', t => {
  t.deepEqual(toggleStationIsolation(stations, {a: false, b: true, c: false}, 'c'), {
    a: false,
    b: false,
    c: true
  })
})
