import test from 'ava'

import {
  buildPointDisplayNames,
  getPointDisplayName,
  replacePointUsageName
} from './quick-declaration-point-name.js'

test('getPointDisplayName privilégie le nom d’usage', t => {
  t.is(
    getPointDisplayName({name: '36-4=1234', usageName: 'Forage de la source'}),
    'Forage de la source'
  )
})

test('getPointDisplayName revient au nom technique si le nom d’usage est vide', t => {
  t.is(getPointDisplayName({name: '36-4=1234'}, '   '), '36-4=1234')
})

test('replacePointUsageName met à jour uniquement le point concerné sans muter la source', t => {
  const points = [
    {id: 'point-1', name: 'PP 1', usageName: 'Forage'},
    {id: 'point-2', name: 'PP 2', usageName: null}
  ]
  const updatedPoints = replacePointUsageName(points, 'point-2', ' Source communale ')

  t.is(updatedPoints[0], points[0])
  t.deepEqual(updatedPoints[1], {id: 'point-2', name: 'PP 2', usageName: 'Source communale'})
  t.is(points[1].usageName, null)
  t.is(replacePointUsageName(points, 'point-1', '')[0].usageName, null)
})

test('buildPointDisplayNames utilise les brouillons sans modifier les points', t => {
  const point = {id: 'point-1', name: '36-4=1234', usageName: null}

  t.deepEqual(
    buildPointDisplayNames([point], {'point-1': {usageName: 'Forage de la source'}}),
    {'point-1': 'Forage de la source'}
  )
  t.is(point.usageName, null)
})
