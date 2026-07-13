import test from 'ava'

import {
  buildPointDisplayNames,
  buildPointUsageNameChanges,
  getPointDisplayName
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

test('buildPointUsageNameChanges ne renvoie que les noms réellement modifiés', t => {
  const points = [
    {id: 'point-1', name: 'PP 1', usageName: 'Forage'},
    {id: 'point-2', name: 'PP 2', usageName: null},
    {id: 'point-3', name: 'PP 3', usageName: 'Ancien nom'}
  ]
  const rows = {
    'point-1': {usageName: ' Forage '},
    'point-2': {usageName: 'Source communale', value: ''},
    'point-3': {usageName: ''}
  }

  t.deepEqual(buildPointUsageNameChanges(points, rows), [
    {pointPrelevementId: 'point-2', usageName: 'Source communale'},
    {pointPrelevementId: 'point-3', usageName: null}
  ])
})

test('buildPointDisplayNames utilise les brouillons sans modifier les points', t => {
  const point = {id: 'point-1', name: '36-4=1234', usageName: null}

  t.deepEqual(
    buildPointDisplayNames([point], {'point-1': {usageName: 'Forage de la source'}}),
    {'point-1': 'Forage de la source'}
  )
  t.is(point.usageName, null)
})
