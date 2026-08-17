import test from 'ava'

import {
  buildSandreZoneOptions,
  formatSandreZoneLabel,
  getSandreZoneFilterLabels
} from './data-export-filters.js'

test('les zones SANDRE sont regroupées par type et triées par nom', t => {
  const groups = buildSandreZoneOptions([
    {
      id: 'sup-2', code: 'SUP-2', name: 'Zone Z', type: 'SUP', source: 'SANDRE_ZAS'
    },
    {
      id: 'sou-1', code: 'SOU-1', name: 'Nappe A', type: 'SOU', source: 'SANDRE_ZAS'
    },
    {
      id: 'sup-1', code: 'SUP-1', name: 'Zone A', type: 'SUP', source: 'SANDRE_ZAS'
    },
    {
      id: 'aep-1', code: 'AEP-1', name: 'Zone AEP', type: 'AEP', source: 'SANDRE_ZAS'
    }
  ])

  t.deepEqual(groups.map(group => group.label), [
    'Eaux superficielles',
    'Eaux souterraines'
  ])
  t.deepEqual(groups[0].options.map(option => option.value), ['sup-1', 'sup-2'])
  t.is(groups[0].options[0].label, 'Zone A — SUP-1')
  t.is(groups[1].options[0].label, 'Nappe A — SOU-1')
  t.false(groups.some(group => group.options.some(option => option.value === 'aep-1')))
})

test('le libellé SANDRE reste robuste lorsque le nom ou le code manque', t => {
  t.is(formatSandreZoneLabel({id: 'zone-id', name: 'Zone A', code: 'SUP-1'}), 'Zone A — SUP-1')
  t.is(formatSandreZoneLabel({id: 'zone-id', name: 'Zone A'}), 'Zone A')
  t.is(formatSandreZoneLabel({id: 'zone-id'}), 'zone-id')
})

test('l’historique privilégie son snapshot puis les options courantes', t => {
  const labels = getSandreZoneFilterLabels({
    sandreZoneIds: ['zone-1', 'zone-2', 'zone-inconnue'],
    sandreZones: [
      {
        id: 'zone-1', code: 'SUP-1', name: 'Ancien nom', type: 'SUP'
      }
    ]
  }, new Map([
    ['zone-1', 'Nouveau nom — SUP-1'],
    ['zone-2', 'Nappe B — SOU-2']
  ]))

  t.deepEqual(labels, [
    'Ancien nom — SUP-1',
    'Nappe B — SOU-2',
    'zone-inconnue'
  ])
})

test('un historique snapshot-only reste lisible et un ancien export reste compatible', t => {
  t.deepEqual(getSandreZoneFilterLabels({
    sandreZones: [
      {
        id: 'zone-1', code: 'SUP-1', name: 'Zone A', type: 'SUP'
      }
    ]
  }), ['Zone A — SUP-1'])
  t.deepEqual(getSandreZoneFilterLabels({zoneIds: ['territoire-1']}), [])
})
