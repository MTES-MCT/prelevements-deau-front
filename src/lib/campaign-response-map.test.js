import test from 'ava'

import {campaignResponseMapPoints} from './campaign-response-map.js'

test('la carte conserve les identités des cibles autorisées et des noms de saisie', t => {
  t.deepEqual(campaignResponseMapPoints([{
    id: 'target', pointPrelevementId: 'physical-point',
    pointPrelevement: {name: 'Forage', usageName: 'Mon forage', coordinates: {type: 'Point', coordinates: [4.8, 45.6]}}
  }]), [{id: 'target', name: 'Mon forage', coordinates: {type: 'Point', coordinates: [4.8, 45.6]}}])
})

test('la carte omet les coordonnées absentes ou invalides, jamais la liste de saisie', t => {
  const coordinates = [null, {}, {type: 'LineString', coordinates: [4, 45]}, ...[[200, 45], [4, 92], ['4', 45], [Number.NaN, 45], [null, 45], [4]].map(coordinates => ({type: 'Point', coordinates}))]
  const targets = coordinates.map((coordinates, index) => ({id: String(index), pointPrelevement: {coordinates}}))
  t.deepEqual(campaignResponseMapPoints(targets), [])
  t.is(targets.length, 9)
})

test('les points à longitude ou latitude zéro restent localisables sans exposer le reste du contexte', t => {
  const points = campaignResponseMapPoints([{
    id: 'target', preleveur: {email: 'private@example.test'}, meters: [{serialNumber: 'private'}],
    pointPrelevement: {name: 'Point', coordinates: {type: 'Point', coordinates: [0, 0, 300]}}
  }])
  t.deepEqual(points, [{id: 'target', name: 'Point', coordinates: {type: 'Point', coordinates: [0, 0]}}])
})
