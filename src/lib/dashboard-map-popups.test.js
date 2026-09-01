import test from 'ava'

import {
  canLoadDashboardPointActors,
  getResolvedCachedValue,
  indexDashboardMapItems,
  loadCachedValue,
  normalizeDashboardMapCapabilities,
  normalizeDashboardPointActors
} from './dashboard-map-popups.js'

test('les capacités de la carte sont refusées par défaut et exigent un booléen strict', t => {
  t.deepEqual(normalizeDashboardMapCapabilities(), {
    readPointActors: false,
    readPointDetails: false
  })
  t.deepEqual(normalizeDashboardMapCapabilities({
    readPointActors: true,
    readPointDetails: 'true'
  }), {
    readPointActors: true,
    readPointDetails: false
  })
})

test('les acteurs ne sont chargés que lorsque la capability et l’affichage le permettent', t => {
  t.false(canLoadDashboardPointActors())
  t.false(canLoadDashboardPointActors({readPointActors: false}))
  t.false(canLoadDashboardPointActors({readPointActors: true}, {showPreleveurs: false}))
  t.true(canLoadDashboardPointActors({readPointActors: true}))
})

test('les points et stations sont indexés avec la même clé que les propriétés MapLibre', t => {
  const first = {id: 42, label: 'Premier'}
  const second = {id: 'station-1', label: 'Second'}
  const index = indexDashboardMapItems([first, null, second, {}])

  t.is(index.size, 2)
  t.is(index.get('42'), first)
  t.is(index.get('station-1'), second)
})

test('le résumé acteurs tolère les groupes absents et normalise les libellés', t => {
  t.deepEqual(normalizeDashboardPointActors({
    pointId: 'point-1',
    preleveurs: [
      {id: 'preleveur-1', label: '  Société A  '},
      {id: 'preleveur-2', label: ''}
    ]
  }), {
    pointId: 'point-1',
    preleveurs: [
      {id: 'preleveur-1', label: 'Société A'},
      {id: 'preleveur-2', label: 'Non renseigné'}
    ],
    collecteurs: []
  })
})

test('le cache mutualise une requête en vol puis expose sa valeur résolue', async t => {
  const cache = new Map()
  let callCount = 0
  const loader = async () => {
    callCount += 1
    return {preleveurs: [{id: 'preleveur-1', label: 'Société A'}]}
  }

  const firstRequest = loadCachedValue(cache, 'point-1', loader)
  const secondRequest = loadCachedValue(cache, 'point-1', loader)

  t.is(firstRequest, secondRequest)
  const value = await firstRequest
  t.is(callCount, 1)
  t.is(getResolvedCachedValue(cache, 'point-1'), value)
  t.is(loadCachedValue(cache, 'point-1', loader), value)
})

test('une requête acteurs en erreur est retirée du cache pour permettre un nouvel essai', async t => {
  const cache = new Map()
  const error = new Error('indisponible')

  await t.throwsAsync(loadCachedValue(cache, 'point-1', async () => {
    throw error
  }), {is: error})

  t.false(cache.has('point-1'))
  t.deepEqual(
    await loadCachedValue(cache, 'point-1', async () => ({preleveurs: []})),
    {preleveurs: []}
  )
})
