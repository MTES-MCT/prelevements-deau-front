import test from 'ava'

import {
  getAgentActiveZoneSummary,
  getAgentCurrentAndFutureZoneIds,
  getAgentName,
  getAgentVisibleZones,
  groupZoneOptions
} from './agents.js'

test('getAgentName utilise le nom puis l’email', t => {
  t.is(getAgentName({firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test'}), 'Ada Lovelace')
  t.is(getAgentName({email: 'ada@example.test'}), 'ada@example.test')
})

test('getAgentActiveZoneSummary distingue accès actifs, futurs et absents', t => {
  t.is(getAgentActiveZoneSummary({activeHabilitationsCount: 2}), '2 zones actives')
  t.is(getAgentActiveZoneSummary({futureHabilitationsCount: 1}), '1 accès à venir')
  t.is(getAgentActiveZoneSummary({}), 'Aucun accès actif')
})

test('getAgentVisibleZones limite les zones affichées', t => {
  const summary = getAgentVisibleZones({
    zones: [
      {id: 'a', status: 'ACTIVE'},
      {id: 'b', status: 'FUTURE'},
      {id: 'c', status: 'ACTIVE'},
      {id: 'd', status: 'ENDED'}
    ]
  })

  t.deepEqual(summary.visible.map(zone => zone.id), ['a', 'b'])
  t.is(summary.remainingCount, 1)
})

test('getAgentCurrentAndFutureZoneIds exclut les accès terminés', t => {
  t.deepEqual([...getAgentCurrentAndFutureZoneIds({
    habilitations: [
      {status: 'ACTIVE', zoneId: 'a'},
      {status: 'FUTURE', zone: {id: 'b'}},
      {status: 'ENDED', zoneId: 'c'}
    ]
  })], ['a', 'b'])
})

test('groupZoneOptions groupe et trie les zones par libellé métier', t => {
  t.deepEqual(groupZoneOptions([
    {id: 's', type: 'SAGE', name: 'Zorn'},
    {id: 'r', type: 'REGION', name: 'Bretagne'},
    {id: 's2', type: 'SAGE', name: 'Adour'}
  ]), [
    {
      label: 'Régions',
      options: [{value: 'r', label: 'Bretagne', content: 'Bretagne'}]
    },
    {
      label: 'SAGE',
      options: [
        {value: 's2', label: 'Adour', content: 'Adour'},
        {value: 's', label: 'Zorn', content: 'Zorn'}
      ]
    }
  ])
})
